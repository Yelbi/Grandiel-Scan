import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { db } from './db';
import { mangas, chapters } from './db/schema';
import { eq, desc, asc, sql, and } from 'drizzle-orm';
import type { Manga, Chapter } from './types';

// ── Mappers ──────────────────────────────────────────────────────────────────

function toManga(
  row: typeof mangas.$inferSelect,
  chapterNums: number[] = [],
): Manga {
  return {
    id:            row.id,
    slug:          row.id, // id IS the slug
    title:         row.title,
    image:         row.image,
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

export async function getChaptersByManga(mangaId: string): Promise<Chapter[]> {
  try {
    const rows = await db
      .select()
      .from(chapters)
      .where(eq(chapters.mangaId, mangaId))
      .orderBy(asc(chapters.chapter));
    return rows.map(toChapter);
  } catch (err) {
    console.error('[data] getChaptersByManga error:', err);
    return [];
  }
}

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
