import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mangas, syncRuns } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { runSync } from '@/lib/scraper/sync';
import { discoverChapters } from '@/lib/scraper/discover';

/**
 * Configuración del origen de cada manga para la sincronización automática,
 * más las acciones de prueba del panel de admin.
 * Protegido por el Basic Auth del middleware, como el resto de /api/admin/*.
 */

export const maxDuration = 60;

/* ── GET — configuración actual + última sincronización de cada manga ── */
export async function GET() {
  try {
    const rows = await db
      .select({
        id:            mangas.id,
        title:         mangas.title,
        latestChapter: mangas.latestChapter,
        sourceUrl:     mangas.sourceUrl,
        sourceCdnBase: mangas.sourceCdnBase,
        sourceExt:     mangas.sourceExt,
        autoSync:      mangas.autoSync,
        lastSyncedAt:  mangas.lastSyncedAt,
      })
      .from(mangas)
      .orderBy(mangas.title);

    // Últimas pasadas del cron, para ver de un vistazo qué falló.
    const recent = await db
      .select()
      .from(syncRuns)
      .orderBy(desc(syncRuns.createdAt))
      .limit(60);

    return NextResponse.json({ mangas: rows, recent });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ── PATCH — guardar la configuración de origen de un manga ── */
export async function PATCH(req: NextRequest) {
  try {
    const { mangaId, sourceUrl, sourceCdnBase, sourceExt, autoSync } = await req.json();

    if (!mangaId || typeof mangaId !== 'string') {
      return NextResponse.json({ error: 'mangaId requerido.' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (sourceUrl !== undefined) {
      const v = String(sourceUrl).trim();
      if (v && !isHttpUrl(v)) {
        return NextResponse.json({ error: 'La URL de la serie debe empezar por https://' }, { status: 400 });
      }
      updates.sourceUrl = v || null;
    }

    if (sourceCdnBase !== undefined) {
      const v = String(sourceCdnBase).trim().replace(/\/+$/, '');
      if (v && !isHttpUrl(v)) {
        return NextResponse.json({ error: 'La base del CDN debe empezar por https://' }, { status: 400 });
      }
      updates.sourceCdnBase = v || null;
    }

    if (sourceExt !== undefined) {
      const v = String(sourceExt).trim().toLowerCase();
      if (!/^[a-z0-9]{1,5}$/.test(v)) {
        return NextResponse.json({ error: 'Extensión inválida.' }, { status: 400 });
      }
      updates.sourceExt = v;
    }

    if (autoSync !== undefined) updates.autoSync = Boolean(autoSync);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No se enviaron cambios.' }, { status: 400 });
    }

    const [updated] = await db
      .update(mangas)
      .set(updates)
      .where(eq(mangas.id, mangaId))
      .returning({
        id:            mangas.id,
        sourceUrl:     mangas.sourceUrl,
        sourceCdnBase: mangas.sourceCdnBase,
        sourceExt:     mangas.sourceExt,
        autoSync:      mangas.autoSync,
      });

    if (!updated) {
      return NextResponse.json({ error: 'Manga no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...updated });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ── POST — acciones de prueba ──────────────────────────────────────────
   { action: 'discover', sourceUrl }  → solo lee la lista de capítulos del origen
   { action: 'sync', mangaId, dryRun } → pasada completa sobre un manga        ── */
export async function POST(req: NextRequest) {
  try {
    const { action, sourceUrl, mangaId, dryRun } = await req.json();

    if (action === 'discover') {
      if (!sourceUrl || !isHttpUrl(String(sourceUrl))) {
        return NextResponse.json({ error: 'sourceUrl inválida.' }, { status: 400 });
      }
      const result = await discoverChapters(String(sourceUrl));
      return NextResponse.json(result);
    }

    if (action === 'sync') {
      if (!mangaId || typeof mangaId !== 'string') {
        return NextResponse.json({ error: 'mangaId requerido.' }, { status: 400 });
      }
      // Presupuesto más corto que el del cron: aquí hay alguien esperando la respuesta.
      const summary = await runSync({
        mangaId,
        dryRun: Boolean(dryRun),
        timeBudgetMs: 45_000,
      });
      return NextResponse.json(summary);
    }

    return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

function isHttpUrl(v: string): boolean {
  try {
    return new URL(v).protocol === 'https:';
  } catch {
    return false;
  }
}
