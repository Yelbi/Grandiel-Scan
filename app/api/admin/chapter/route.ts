import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chapters, mangas } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { revalidateManga } from '@/lib/revalidate';
import { notifyFavoriteUsers } from '@/lib/push';

function normalizeChapter(value: unknown): number | null {
  const num = typeof value === 'number' ? value : Number(value);
  if (!isFinite(num) || num < 0) return null;
  return num;
}

/* ── GET — obtener un capítulo ── */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mangaId = searchParams.get('mangaId');
    const chapterNum = normalizeChapter(searchParams.get('chapter'));

    if (!mangaId || chapterNum === null) {
      return NextResponse.json({ error: 'mangaId y chapter requeridos.' }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(chapters)
      .where(and(eq(chapters.mangaId, mangaId), eq(chapters.chapter, chapterNum)))
      .limit(1);

    if (!rows[0]) {
      return NextResponse.json({ error: 'Capítulo no encontrado.' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ── POST — añadir capítulo ── */
export async function POST(req: NextRequest) {
  try {
    const { mangaId, chapter: chapterNum, pages, baseUrl } = await req.json();
    const chapterValue = normalizeChapter(chapterNum);

    if (!mangaId || chapterValue === null || !Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    const duplicate = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(and(eq(chapters.mangaId, mangaId), eq(chapters.chapter, chapterValue)))
      .limit(1);

    if (duplicate.length > 0) {
      return NextResponse.json(
        { error: `El capítulo ${chapterValue} de "${mangaId}" ya existe.` },
        { status: 409 },
      );
    }

    const [chapter] = await db
      .insert(chapters)
      .values({ mangaId, chapter: chapterValue, pages, baseUrl: baseUrl ?? null })
      .returning();

    // Actualizar latestChapter y lastUpdated del manga si corresponde
    const mangaRows = await db
      .select({ latestChapter: mangas.latestChapter, title: mangas.title })
      .from(mangas)
      .where(eq(mangas.id, mangaId))
      .limit(1);

    if (mangaRows[0] && chapterValue >= mangaRows[0].latestChapter) {
      await db
        .update(mangas)
        .set({
          latestChapter: chapterValue,
          lastUpdated:   new Date().toISOString().split('T')[0],
        })
        .where(eq(mangas.id, mangaId));
    }

    revalidateManga(mangaId);

    // Notificación push solo a usuarios que tienen este manga en favoritos
    void notifyFavoriteUsers(mangaId, {
      title: '¡Nuevo capítulo disponible!',
      body:  `${mangaRows[0]?.title ?? mangaId} — Capítulo ${chapterValue}`,
      url:   `/chapter/${mangaId}/${chapterValue}`,
      icon:  '/img/logo.jpg',
    });

    return NextResponse.json({ ok: true, chapter });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ── PATCH — editar capítulo (pages y/o baseUrl) ── */
export async function PATCH(req: NextRequest) {
  try {
    const { mangaId, chapter: chapterNum, pages, baseUrl } = await req.json();
    const chapterValue = normalizeChapter(chapterNum);

    if (!mangaId || chapterValue === null || !Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json({ error: 'mangaId, chapter y pages requeridos.' }, { status: 400 });
    }

    const existing = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(and(eq(chapters.mangaId, mangaId), eq(chapters.chapter, chapterValue)))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: 'Capítulo no encontrado.' }, { status: 404 });
    }

    const [chapter] = await db
      .update(chapters)
      .set({ pages, ...(baseUrl !== undefined && { baseUrl }) })
      .where(and(eq(chapters.mangaId, mangaId), eq(chapters.chapter, chapterValue)))
      .returning();

    revalidateManga(mangaId);
    return NextResponse.json({ ok: true, chapter });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ── DELETE — eliminar capítulo ── */
export async function DELETE(req: NextRequest) {
  try {
    const { mangaId, chapter: chapterNum } = await req.json();
    const chapterValue = normalizeChapter(chapterNum);

    if (!mangaId || chapterValue === null) {
      return NextResponse.json({ error: 'mangaId y chapter requeridos.' }, { status: 400 });
    }

    const existing = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(and(eq(chapters.mangaId, mangaId), eq(chapters.chapter, chapterValue)))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: 'Capítulo no encontrado.' }, { status: 404 });
    }

    await db
      .delete(chapters)
      .where(and(eq(chapters.mangaId, mangaId), eq(chapters.chapter, chapterValue)));

    // Recalcular latestChapter desde los capítulos restantes
    const remaining = await db
      .select({ chapter: chapters.chapter })
      .from(chapters)
      .where(eq(chapters.mangaId, mangaId))
      .orderBy(desc(chapters.chapter))
      .limit(1);

    await db
      .update(mangas)
      .set({
        latestChapter: remaining[0]?.chapter ?? 0,
        lastUpdated:   new Date().toISOString().split('T')[0],
      })
      .where(eq(mangas.id, mangaId));

    revalidateManga(mangaId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
