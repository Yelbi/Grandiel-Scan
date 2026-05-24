import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { db } from './db';
import { mangas, chapters } from './db/schema';
import { eq, desc, asc, sql, and, inArray } from 'drizzle-orm';
import type { Manga, Chapter } from './types';

// ── Mappers ──────────────────────────────────────────────────────────────────

/** Garantiza que la URL de imagen sea absoluta o tenga barra inicial.
 *  Corrige entradas de BD que se guardaron sin "/" (ej: "portada.webp" → "/img/portada.webp"). */
function normalizeImageUrl(url: string): string {
  if (!url) return '/img/placeholder.svg';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) return url;
  return `/img/${url}`;
}

function toManga(
  row: typeof mangas.$inferSelect,
  chapterNums: number[] = [],
): Manga {
  return {
    id:            row.id,
    slug:          row.id, // id IS the slug
    title:         row.title,
    image:         normalizeImageUrl(row.image),
    description:   row.description,
    genres:        row.genres,
    type:          row.type,
    status:        row.status,
    dateAdded:     row.dateAdded,
    lastUpdated:   row.lastUpdated,
    latestChapter: row.latestChapter,
    chapters:      chapterNums,
    views:         row.views,
  };
}

function toChapter(row: typeof chapters.$inferSelect): Chapter {
  return {
    mangaId: row.mangaId,
    chapter: row.chapter,
    baseUrl: row.baseUrl ?? undefined,
    pages:   row.pages,
  };
}

// ── Queries ──────────────────────────────────────────────────────────────────

/** Cross-request cache (ISR-aware). Revalidada via tag 'mangas' cuando el admin
 *  actualiza datos. React.cache encima deduplica dentro del mismo render. */
const _getAllMangas = unstable_cache(
  async function _getAllMangas(): Promise<Manga[]> {
    const rows = await db.select().from(mangas).orderBy(desc(mangas.lastUpdated));
    return rows.map((r) => toManga(r));
  },
  ['all-mangas'],
  { tags: ['mangas'], revalidate: 300 },
);

export const getAllMangas = cache(async function getAllMangas(): Promise<Manga[]> {
  try {
    return await _getAllMangas();
  } catch (err) {
    console.error('[data] getAllMangas error:', err);
    return [];
  }
});

/** Like getAllMangas but includes chapter numbers — used by admin to populate chapter selects. */
export async function getAllMangasWithChapters(): Promise<Manga[]> {
  try {
    const [mangaRows, chapterRows] = await Promise.all([
      db.select().from(mangas).orderBy(desc(mangas.lastUpdated)),
      db
        .select({ mangaId: chapters.mangaId, chapter: chapters.chapter })
        .from(chapters)
        .orderBy(asc(chapters.chapter)),
    ]);
    const chapterMap = new Map<string, number[]>();
    for (const c of chapterRows) {
      const arr = chapterMap.get(c.mangaId) ?? [];
      arr.push(c.chapter);
      chapterMap.set(c.mangaId, arr);
    }
    return mangaRows.map((r) => toManga(r, chapterMap.get(r.id) ?? []));
  } catch (err) {
    console.error('[data] getAllMangasWithChapters error:', err);
    return [];
  }
}

const _getMangaById = unstable_cache(
  async function _getMangaById(id: string): Promise<Manga | null> {
    const [mangaRows, chapterRows] = await Promise.all([
      db.select().from(mangas).where(eq(mangas.id, id)).limit(1),
      db
        .select({ chapter: chapters.chapter })
        .from(chapters)
        .where(eq(chapters.mangaId, id))
        .orderBy(asc(chapters.chapter)),
    ]);
    if (!mangaRows[0]) return null;
    return toManga(mangaRows[0], chapterRows.map((c) => c.chapter));
  },
  ['manga-by-id'],
  { tags: ['mangas'], revalidate: 300 },
);

/** Fetches manga + its chapter list in parallel (needed for prev/next nav). */
export const getMangaById = cache(async function getMangaById(id: string): Promise<Manga | null> {
  try {
    return await _getMangaById(id);
  } catch (err) {
    console.error('[data] getMangaById error:', err);
    return null;
  }
});

/** Full chapter data — used for generateStaticParams and chapter pages. */
export async function getAllChapters(): Promise<Chapter[]> {
  try {
    const rows = await db
      .select()
      .from(chapters)
      .orderBy(asc(chapters.mangaId), asc(chapters.chapter));
    return rows.map(toChapter);
  } catch (err) {
    console.error('[data] getAllChapters error:', err);
    return [];
  }
}

const _getChapter = unstable_cache(
  async function _getChapter(mangaId: string, cap: number): Promise<Chapter | null> {
    const rows = await db
      .select()
      .from(chapters)
      .where(and(eq(chapters.mangaId, mangaId), eq(chapters.chapter, cap)))
      .limit(1);
    if (!rows[0]) return null;
    return toChapter(rows[0]);
  },
  ['chapter-by-id'],
  { tags: ['chapters'], revalidate: 3600 },
);

export const getChapter = cache(async function getChapter(
  mangaId: string,
  cap: number,
): Promise<Chapter | null> {
  try {
    return await _getChapter(mangaId, cap);
  } catch (err) {
    console.error('[data] getChapter error:', err);
    return null;
  }
});

const _getChaptersByManga = unstable_cache(
  async function _getChaptersByManga(mangaId: string): Promise<Chapter[]> {
    const rows = await db
      .select()
      .from(chapters)
      .where(eq(chapters.mangaId, mangaId))
      .orderBy(asc(chapters.chapter));
    return rows.map(toChapter);
  },
  ['chapters-by-manga'],
  { tags: ['chapters'], revalidate: 3600 },
);

export const getChaptersByManga = cache(async function getChaptersByManga(mangaId: string): Promise<Chapter[]> {
  try {
    return await _getChaptersByManga(mangaId);
  } catch (err) {
    console.error('[data] getChaptersByManga error:', err);
    return [];
  }
});

const _getMostViewed = unstable_cache(
  async function _getMostViewed(limit: number): Promise<Manga[]> {
    const rows = await db.select().from(mangas).orderBy(desc(mangas.views)).limit(limit);
    return rows.map((r) => toManga(r));
  },
  ['most-viewed'],
  { tags: ['mangas'], revalidate: 600 },
);

/** Top N mangas by view count. */
export async function getMostViewed(limit = 6): Promise<Manga[]> {
  try {
    return await _getMostViewed(limit);
  } catch (err) {
    console.error('[data] getMostViewed error:', err);
    return [];
  }
}

const _getRecentMangas = unstable_cache(
  async function _getRecentMangas(limit: number): Promise<Manga[]> {
    const rows = await db
      .select()
      .from(mangas)
      .orderBy(desc(mangas.lastUpdated))
      .limit(limit);
    return rows.map((r) => toManga(r));
  },
  ['recent-mangas'],
  { tags: ['mangas'], revalidate: 300 },
);

/** N most recently updated mangas — for homepage and updates page. */
export async function getRecentMangas(limit = 20): Promise<Manga[]> {
  try {
    return await _getRecentMangas(limit);
  } catch (err) {
    console.error('[data] getRecentMangas error:', err);
    return [];
  }
}

const _getFeaturedMangas = unstable_cache(
  async function _getFeaturedMangas(): Promise<Manga[]> {
    const rows = await db
      .select()
      .from(mangas)
      .where(eq(mangas.featured, true))
      .orderBy(desc(mangas.lastUpdated));
    return rows.map((r) => toManga(r));
  },
  ['featured-mangas'],
  { tags: ['mangas'], revalidate: 300 },
);

/** All mangas marked as featured — for the hero/banner section. */
export async function getFeaturedMangas(): Promise<Manga[]> {
  try {
    return await _getFeaturedMangas();
  } catch (err) {
    console.error('[data] getFeaturedMangas error:', err);
    return [];
  }
}

const _getMangaCount = unstable_cache(
  async function _getMangaCount(): Promise<number> {
    const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(mangas);
    return row?.n ?? 0;
  },
  ['manga-count'],
  { tags: ['mangas'], revalidate: 300 },
);

/** Total number of mangas — for stats bar. Cheaper than fetching all rows. */
export async function getMangaCount(): Promise<number> {
  try {
    return await _getMangaCount();
  } catch (err) {
    console.error('[data] getMangaCount error:', err);
    return 0;
  }
}

/** Fetch a specific set of mangas by their IDs — for favorites/history pages.
 *  Not cached because the set of IDs is dynamic (user-specific). */
export async function getMangasByIds(ids: string[]): Promise<Manga[]> {
  if (ids.length === 0) return [];
  try {
    const rows = await db
      .select()
      .from(mangas)
      .where(inArray(mangas.id, ids));
    return rows.map((r) => toManga(r));
  } catch (err) {
    console.error('[data] getMangasByIds error:', err);
    return [];
  }
}

/** Atomically increments the view counter for a manga. */
export async function incrementViews(mangaId: string): Promise<void> {
  try {
    await db
      .update(mangas)
      .set({ views: sql`${mangas.views} + 1` })
      .where(eq(mangas.id, mangaId));
  } catch (err) {
    console.error('[data] incrementViews error:', err);
  }
}
