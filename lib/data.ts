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

export async function getAllMangas(): Promise<Manga[]> {
  try {
    const rows = await db
      .select()
      .from(mangas)
      .orderBy(desc(mangas.lastUpdated));
    return rows.map((r) => toManga(r));
  } catch (err) {
    console.error('[data] getAllMangas error:', err);
    return [];
  }
}

/** Fetches manga + its chapter list in parallel (needed for prev/next nav). */
export async function getMangaById(id: string): Promise<Manga | null> {
  try {
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
  } catch (err) {
    console.error('[data] getMangaById error:', err);
    return null;
  }
}

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

export async function getChapter(
  mangaId: string,
  cap: number,
): Promise<Chapter | null> {
  try {
    const rows = await db
      .select()
      .from(chapters)
      .where(and(eq(chapters.mangaId, mangaId), eq(chapters.chapter, cap)))
      .limit(1);
    if (!rows[0]) return null;
    return toChapter(rows[0]);
  } catch (err) {
    console.error('[data] getChapter error:', err);
    return null;
  }
}

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

/** Top N mangas by view count. */
export async function getMostViewed(limit = 6): Promise<Manga[]> {
  try {
    const rows = await db
      .select()
      .from(mangas)
      .orderBy(desc(mangas.views))
      .limit(limit);
    return rows.map((r) => toManga(r));
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
