import { NextRequest, NextResponse } from 'next/server';
import { runSync } from '@/lib/scraper/sync';

/**
 * Busca capítulos nuevos en los sitios de origen y los da de alta.
 *
 * Lo dispara GitHub Actions cada 3 h (.github/workflows/sync-chapters.yml) en
 * lugar de un cron de Vercel: en el plan Hobby los crons solo se ejecutan una
 * vez al día, y ese hueco ya lo ocupa /api/cron/cleanup.
 *
 * Protegido con CRON_SECRET, el mismo que usa el cron de limpieza.
 */

// El sondeo de páginas hace decenas de peticiones HTTP por capítulo; con los 10 s
// por defecto no da tiempo. 60 s es el máximo del plan Hobby.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const limit  = clampInt(sp.get('limit'), 1, 50, 10);
  // Margen respecto a maxDuration para que dé tiempo a escribir el registro y responder.
  const budget = clampInt(sp.get('budget'), 5_000, 55_000, 50_000);
  const dryRun = sp.get('dry') === '1';

  try {
    const summary = await runSync({ limit, timeBudgetMs: budget, dryRun });

    console.log(
      `[cron/sync] ${summary.processed} mangas revisados, ${summary.chaptersAdded} capítulos añadidos` +
        (summary.budgetExhausted ? ' (quedaron mangas en cola)' : ''),
    );

    return NextResponse.json({ ok: true, dryRun, ...summary });
  } catch (err) {
    console.error('[cron/sync] Fallo:', err);
    return NextResponse.json(
      { error: 'Fallo al sincronizar.', detail: (err as Error).message },
      { status: 500 },
    );
  }
}

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}
