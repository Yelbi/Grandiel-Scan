import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chapters } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

/* ── GET — listar capítulos de un manga con metadata para verificación ── */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mangaId = searchParams.get('mangaId');
    if (!mangaId) {
      return NextResponse.json({ error: 'mangaId requerido.' }, { status: 400 });
    }

    const rows = await db
      .select({
        chapter: chapters.chapter,
        baseUrl: chapters.baseUrl,
        pages:   chapters.pages,
      })
      .from(chapters)
      .where(eq(chapters.mangaId, mangaId))
      .orderBy(asc(chapters.chapter));

    return NextResponse.json(
      rows.map((r) => ({
        chapter:   r.chapter,
        baseUrl:   r.baseUrl ?? null,
        pageCount: r.pages?.length ?? 0,
        firstPage: r.pages?.[0] ?? null,
      })),
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
