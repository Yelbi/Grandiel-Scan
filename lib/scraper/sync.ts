/**
 * Motor de sincronización automática de capítulos.
 *
 * Encadena las tres piezas: descubrir qué capítulos hay publicados en el origen
 * (discover.ts), averiguar los nombres de archivo de sus páginas (probe.ts) e
 * insertarlos en la base de datos con la misma semántica que el alta manual del
 * panel de admin (latestChapter, revalidación de caché y aviso push).
 *
 * Pensado para correr dentro de una función serverless con tiempo limitado, así
 * que trabaja con presupuesto: procesa mangas hasta agotarlo y deja el resto
 * para la siguiente pasada. La cola se ordena por `lastSyncedAt` ascendente, de
 * modo que ningún manga se queda sin turno.
 */

import { db } from '@/lib/db';
import { mangas, chapters, syncRuns } from '@/lib/db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { revalidateManga } from '@/lib/revalidate';
import { notifyFavoriteUsers } from '@/lib/push';
import { discoverChapters } from './discover';
import { probeChapter } from './probe';

/** Tiempo máximo por pasada. Por debajo del límite de la función para poder cerrar bien. */
const DEFAULT_TIME_BUDGET_MS = 50_000;
/** Cuántos capítulos nuevos se aceptan por manga y pasada. Evita que una serie recién
 *  configurada con 300 capítulos monopolice el presupuesto de tiempo. */
const DEFAULT_MAX_NEW_PER_MANGA = 5;
/** Pausa entre mangas: no conviene martillear el sitio de origen desde una IP fija. */
const DELAY_BETWEEN_MANGAS_MS = 500;

export interface SyncOptions {
  /** Sincronizar solo este manga, ignorando el flag autoSync. Para el botón "probar" del admin. */
  mangaId?: string;
  /** Tope de mangas a revisar en esta pasada. */
  limit?: number;
  timeBudgetMs?: number;
  maxNewPerManga?: number;
  /** Detecta e informa, pero no escribe nada en la base de datos. */
  dryRun?: boolean;
}

export interface MangaSyncOutcome {
  mangaId: string;
  status: 'added' | 'nothing' | 'partial' | 'error' | 'skipped';
  chaptersAdded: number[];
  detail?: string;
  durationMs: number;
}

export interface SyncSummary {
  processed: number;
  chaptersAdded: number;
  /** Quedaron mangas en la cola por falta de tiempo: la siguiente pasada seguirá por ahí. */
  budgetExhausted: boolean;
  results: MangaSyncOutcome[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ── Sincronización de un manga ────────────────────────────────────────── */

type MangaRow = typeof mangas.$inferSelect;

async function syncOneManga(
  manga: MangaRow,
  opts: Required<Pick<SyncOptions, 'maxNewPerManga' | 'dryRun'>> & { deadline: number },
): Promise<MangaSyncOutcome> {
  const startedAt = Date.now();
  const base = (manga.sourceCdnBase ?? '').replace(/\/+$/, '');

  if (!manga.sourceUrl || !base) {
    return {
      mangaId: manga.id,
      status: 'skipped',
      chaptersAdded: [],
      detail: 'Le falta la URL de la serie o la base del CDN.',
      durationMs: Date.now() - startedAt,
    };
  }

  // 1. Qué capítulos hay publicados en el origen
  const discovered = await discoverChapters(manga.sourceUrl);
  if (discovered.error || discovered.chapters.length === 0) {
    return {
      mangaId: manga.id,
      status: 'error',
      chaptersAdded: [],
      detail: discovered.error ?? 'El origen no devolvió ningún capítulo.',
      durationMs: Date.now() - startedAt,
    };
  }

  // 2. Qué capítulos tenemos ya
  const existingRows = await db
    .select({ chapter: chapters.chapter })
    .from(chapters)
    .where(eq(chapters.mangaId, manga.id));
  const existing = new Set(existingRows.map((r) => r.chapter));

  // 3. La diferencia, de menor a mayor y acotada
  const pending = discovered.chapters
    .filter((c) => !existing.has(c.chapter))
    .slice(0, opts.maxNewPerManga);

  if (pending.length === 0) {
    return {
      mangaId: manga.id,
      status: 'nothing',
      chaptersAdded: [],
      detail: `El origen tiene ${discovered.chapters.length} capítulos (vía ${discovered.strategy}); ninguno es nuevo.`,
      durationMs: Date.now() - startedAt,
    };
  }

  const added: number[] = [];
  const failures: string[] = [];

  for (const cand of pending) {
    if (Date.now() > opts.deadline) {
      failures.push(`cap. ${cand.chapter}: sin tiempo en esta pasada`);
      break;
    }

    const baseUrl = `${base}/${cand.id}/`;
    const probe = await probeChapter({
      baseUrl,
      ext: manga.sourceExt || 'webp',
      chapterHint: cand.chapter,
      slugHint: manga.id,
    });

    if (!probe.pages?.length) {
      failures.push(`cap. ${cand.chapter}: ${probe.error ?? 'no se detectaron páginas'}`);
      continue;
    }

    if (opts.dryRun) {
      added.push(cand.chapter);
      continue;
    }

    try {
      await db.insert(chapters).values({
        mangaId: manga.id,
        chapter: cand.chapter,
        pages:   probe.pages,
        baseUrl,
      });
      added.push(cand.chapter);
    } catch (err) {
      failures.push(`cap. ${cand.chapter}: no se pudo guardar (${(err as Error).message})`);
    }
  }

  // 4. Reflejar el alta en el manga y en las cachés
  if (added.length > 0 && !opts.dryRun) {
    const highest = Math.max(...added);
    if (highest > manga.latestChapter) {
      await db
        .update(mangas)
        .set({ latestChapter: highest, lastUpdated: new Date().toISOString().split('T')[0] })
        .where(eq(mangas.id, manga.id));
    }

    revalidateManga(manga.id);

    // Un solo aviso por manga aunque entren varios capítulos de golpe: nadie
    // quiere diez notificaciones seguidas del mismo título.
    await notifyFavoriteUsers(manga.id, {
      title: '¡Nuevo capítulo disponible!',
      body:
        added.length === 1
          ? `${manga.title} — Capítulo ${highest}`
          : `${manga.title} — ${added.length} capítulos nuevos (hasta el ${highest})`,
      url:  `/chapter/${manga.id}/${highest}`,
      icon: '/img/logo.jpg',
    }).catch(() => {
      // Un fallo de push no debe invalidar una sincronización correcta.
    });
  }

  const status: MangaSyncOutcome['status'] =
    added.length > 0 ? (failures.length > 0 ? 'partial' : 'added') : 'error';

  return {
    mangaId: manga.id,
    status,
    chaptersAdded: added,
    detail: failures.length > 0 ? failures.join(' · ') : undefined,
    durationMs: Date.now() - startedAt,
  };
}

/* ── Punto de entrada ──────────────────────────────────────────────────── */

export async function runSync(opts: SyncOptions = {}): Promise<SyncSummary> {
  const timeBudgetMs   = opts.timeBudgetMs   ?? DEFAULT_TIME_BUDGET_MS;
  const maxNewPerManga = opts.maxNewPerManga ?? DEFAULT_MAX_NEW_PER_MANGA;
  const dryRun         = opts.dryRun         ?? false;
  const deadline       = Date.now() + timeBudgetMs;

  // Cola: o un manga concreto, o los que tienen autoSync activo empezando por
  // el que lleva más tiempo sin revisarse (nulls primero: nunca sincronizados).
  const queue = opts.mangaId
    ? await db.select().from(mangas).where(eq(mangas.id, opts.mangaId)).limit(1)
    : await db
        .select()
        .from(mangas)
        .where(and(eq(mangas.autoSync, true), sql`${mangas.sourceUrl} IS NOT NULL`))
        .orderBy(sql`${mangas.lastSyncedAt} ASC NULLS FIRST`, asc(mangas.id))
        .limit(opts.limit ?? 10);

  const results: MangaSyncOutcome[] = [];
  let budgetExhausted = false;

  for (const manga of queue) {
    if (Date.now() > deadline) {
      budgetExhausted = true;
      break;
    }

    let outcome: MangaSyncOutcome;
    try {
      outcome = await syncOneManga(manga, { maxNewPerManga, dryRun, deadline });
    } catch (err) {
      outcome = {
        mangaId: manga.id,
        status: 'error',
        chaptersAdded: [],
        detail: `Fallo inesperado: ${(err as Error).message}`,
        durationMs: 0,
      };
    }

    results.push(outcome);

    if (!dryRun) {
      // lastSyncedAt se actualiza pase lo que pase, también en error: si no, un
      // manga cuyo origen falla siempre se quedaría fijo al frente de la cola
      // bloqueando a los demás en cada pasada.
      await db
        .update(mangas)
        .set({ lastSyncedAt: new Date() })
        .where(eq(mangas.id, manga.id))
        .catch(() => {});

      await db
        .insert(syncRuns)
        .values({
          mangaId:       manga.id,
          status:        outcome.status,
          chaptersAdded: outcome.chaptersAdded.length,
          chapters:      outcome.chaptersAdded,
          detail:        outcome.detail ?? null,
          durationMs:    outcome.durationMs,
        })
        .catch(() => {});
    }

    if (queue.length > 1) await sleep(DELAY_BETWEEN_MANGAS_MS);
  }

  return {
    processed:     results.length,
    chaptersAdded: results.reduce((n, r) => n + r.chaptersAdded.length, 0),
    budgetExhausted,
    results,
  };
}
