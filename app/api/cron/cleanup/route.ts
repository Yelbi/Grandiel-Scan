import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimitStore, comments, syncRuns } from '@/lib/db/schema';
import { lt, and, eq, sql } from 'drizzle-orm';

/**
 * Cron endpoint de limpieza.
 * Llamar desde Vercel Cron (vercel.json) o Supabase Scheduled Functions una vez al día.
 *
 * Protegido con CRON_SECRET para que solo el scheduler pueda invocarlo.
 * Configura CRON_SECRET en las variables de entorno de Vercel.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, number> = {};

  try {
    // 1. Borrar entradas expiradas del rate limit store (más de 1 día expiradas)
    const rlResult = await db
      .delete(rateLimitStore)
      .where(lt(rateLimitStore.resetAt, sql`now() - INTERVAL '1 day'`))
      .returning({ key: rateLimitStore.key });
    results.rateLimitDeleted = rlResult.length;
  } catch (err) {
    console.error('[cron/cleanup] Error limpiando rate_limit_store:', err);
    results.rateLimitError = 1;
  }

  try {
    // 2. Borrar físicamente comentarios soft-deleted con más de 30 días de antigüedad
    const commentsResult = await db
      .delete(comments)
      .where(
        and(
          eq(comments.deleted, true),
          lt(comments.createdAt, sql`now() - INTERVAL '30 days'`),
        ),
      )
      .returning({ id: comments.id });
    results.commentsHardDeleted = commentsResult.length;
  } catch (err) {
    console.error('[cron/cleanup] Error limpiando comentarios borrados:', err);
    results.commentsError = 1;
  }

  try {
    // 3. Podar el historial de sincronizaciones (~2.400 filas/mes con 10 mangas cada 3 h)
    const syncResult = await db
      .delete(syncRuns)
      .where(lt(syncRuns.createdAt, sql`now() - INTERVAL '30 days'`))
      .returning({ id: syncRuns.id });
    results.syncRunsDeleted = syncResult.length;
  } catch (err) {
    console.error('[cron/cleanup] Error limpiando sync_runs:', err);
    results.syncRunsError = 1;
  }

  console.log('[cron/cleanup] Completado:', results);
  return NextResponse.json({ ok: true, ...results });
}
