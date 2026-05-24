import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { comments, users } from '@/lib/db/schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

type Params = { params: Promise<{ mangaId: string }> };

const COMMENTS_PAGE_SIZE = 50;

/* ── GET — obtener comentarios (público, paginado) ── */
export async function GET(
  req: NextRequest,
  { params }: Params,
) {
  try {
    const { mangaId } = await params;
    const sp = req.nextUrl.searchParams;
    const chapterParam = sp.get('chapter');
    const pageParam    = sp.get('page') ?? '1';

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

    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const offset = (page - 1) * COMMENTS_PAGE_SIZE;

    const whereClause = and(
      eq(comments.mangaId, mangaId),
      eq(comments.deleted, false),
      chapter !== null
        ? eq(comments.chapter, chapter)
        : sql`${comments.chapter} IS NULL`,
    );

    const [rows, [{ total }]] = await Promise.all([
      db
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
        .where(whereClause)
        .orderBy(desc(comments.createdAt))
        .limit(COMMENTS_PAGE_SIZE)
        .offset(offset),
      db
        .select({ total: count() })
        .from(comments)
        .where(whereClause),
    ]);

    const hasMore = rows.length === COMMENTS_PAGE_SIZE;

    return NextResponse.json({ comments: rows, page, hasMore, total });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

/* ── POST — publicar comentario (requiere autenticación) ── */
export async function POST(
  req: NextRequest,
  { params }: Params,
) {
  try {
    // 10 comentarios por usuario (por IP) cada 10 minutos
    const ip = getClientIp(req);
    const rl = await rateLimit(`comment:${ip}`, 10, 10 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Demasiados comentarios. Espera unos minutos.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
      );
    }

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
    const trimmedText = typeof text === 'string' ? text.trim() : '';
    if (!trimmedText || trimmedText.length > 500) {
      return NextResponse.json({ error: 'Comentario inválido.' }, { status: 400 });
    }
    if (
      chapter !== undefined &&
      (typeof chapter !== 'number' || !Number.isInteger(chapter) || chapter < 1 || chapter > 100_000)
    ) {
      return NextResponse.json({ error: 'chapter inválido.' }, { status: 400 });
    }
    const chapterValue = chapter === undefined ? null : (chapter as number);

    // Sanear < y > para prevenir inyección HTML en clientes que no escapen correctamente
    const safeText = trimmedText.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const [comment] = await db
      .insert(comments)
      .values({ mangaId, userId: user.id, text: safeText, chapter: chapterValue })
      .returning();

    return NextResponse.json({ ok: true, comment });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
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
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
