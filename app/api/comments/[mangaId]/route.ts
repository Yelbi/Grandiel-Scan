import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { comments, users } from '@/lib/db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ mangaId: string }> };

/* ── GET — obtener comentarios (público) ── */
export async function GET(
  req: NextRequest,
  { params }: Params,
) {
  try {
    const { mangaId } = await params;
    const chapterParam = req.nextUrl.searchParams.get('chapter');
    let chapter: number | null = null;

    if (chapterParam !== null) {
      if (!/^\d+$/.test(chapterParam)) {
        return NextResponse.json({ error: 'chapter inválido.' }, { status: 400 });
      }
      chapter = Number(chapterParam);
      if (chapter < 1) {
        return NextResponse.json({ error: 'chapter inválido.' }, { status: 400 });
      }
    }

    const rows = await db
      .select({
        id:        comments.id,
        text:      comments.text,
        createdAt: comments.createdAt,
        userId:    comments.userId,
        username:  users.username,
        avatar:    users.avatar,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(and(
        eq(comments.mangaId, mangaId),
        eq(comments.deleted, false),
        chapter !== null
          ? eq(comments.chapter, chapter)
          : sql`${comments.chapter} IS NULL`,
      ))
      .orderBy(asc(comments.createdAt));

    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ── POST — publicar comentario (requiere autenticación) ── */
export async function POST(
  req: NextRequest,
  { params }: Params,
) {
  try {
    const { mangaId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para comentar.' },
        { status: 401 },
      );
    }

    const { text, chapter } = await req.json() as { text: string; chapter?: unknown };
    if (!text?.trim() || text.trim().length > 500) {
      return NextResponse.json({ error: 'Comentario inválido.' }, { status: 400 });
    }
    if (
      chapter !== undefined &&
      (typeof chapter !== 'number' || !Number.isInteger(chapter) || chapter < 1)
    ) {
      return NextResponse.json({ error: 'chapter inválido.' }, { status: 400 });
    }
    const chapterValue = chapter === undefined ? null : (chapter as number);

    const [comment] = await db
      .insert(comments)
      .values({ mangaId, userId: user.id, text: text.trim(), chapter: chapterValue })
      .returning();

    return NextResponse.json({ ok: true, comment });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ── DELETE — soft-delete de comentario propio ── */
export async function DELETE(
  req: NextRequest,
  { params }: Params,
) {
  try {
    const { mangaId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { commentId } = await req.json() as { commentId: number };
    if (commentId == null || typeof commentId !== 'number') {
      return NextResponse.json({ error: 'commentId requerido.' }, { status: 400 });
    }

    await db
      .update(comments)
      .set({ deleted: true })
      .where(
        and(
          eq(comments.id, commentId),
          eq(comments.userId, user.id),
          eq(comments.mangaId, mangaId),
        ),
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
