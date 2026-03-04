import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mangas, chapters } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidateManga } from '@/lib/revalidate';

/* ── GET — listar todos los mangas ── */
export async function GET() {
  try {
    const rows = await db.select().from(mangas).orderBy(mangas.title);
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ── POST — crear manga ── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, image, description, genres, type, status, dateAdded, lastUpdated, latestChapter, featured } = body;

    if (!id || !title) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    const existing = await db.select({ id: mangas.id }).from(mangas).where(eq(mangas.id, id)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: `Ya existe un manga con id "${id}".` }, { status: 409 });
    }

    const today = new Date().toISOString().split('T')[0];
    const [manga] = await db
      .insert(mangas)
      .values({
        id,
        title,
        image:         image         ?? '',
        description:   description   ?? '',
        genres:        genres        ?? [],
        type:          type          ?? 'Manhwa',
        status:        status        ?? 'En Emision',
        dateAdded:     dateAdded     ?? today,
        lastUpdated:   lastUpdated   ?? today,
        latestChapter: latestChapter ?? 0,
        featured:      featured      ?? false,
      })
      .returning();

    revalidateManga(id);
    return NextResponse.json({ ok: true, manga });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ── PATCH — editar manga ── */
export async function PATCH(req: NextRequest) {
  try {
    const { id, title, image, description, genres, type, status, dateAdded, featured } = await req.json();

    if (!id) return NextResponse.json({ error: 'id requerido.' }, { status: 400 });

    const existing = await db.select({ id: mangas.id }).from(mangas).where(eq(mangas.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: `No existe manga con id "${id}".` }, { status: 404 });
    }

    const [manga] = await db
      .update(mangas)
      .set({
        ...(title       !== undefined && { title }),
        ...(image       !== undefined && { image }),
        ...(description !== undefined && { description }),
        ...(genres      !== undefined && { genres }),
        ...(type        !== undefined && { type }),
        ...(status      !== undefined && { status }),
        ...(dateAdded   !== undefined && { dateAdded }),
        ...(featured    !== undefined && { featured }),
      })
      .where(eq(mangas.id, id))
      .returning();

    revalidateManga(id);
    return NextResponse.json({ ok: true, manga });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ── DELETE — eliminar manga y sus capítulos (cascade en BD) ── */
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id requerido.' }, { status: 400 });

    const existing = await db.select({ id: mangas.id }).from(mangas).where(eq(mangas.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: `No existe manga con id "${id}".` }, { status: 404 });
    }

    // Contar capítulos antes del cascade
    const chapterRows = await db.select({ id: chapters.id }).from(chapters).where(eq(chapters.mangaId, id));
    const removedChapters = chapterRows.length;

    await db.delete(mangas).where(eq(mangas.id, id)); // FK cascade borra capítulos

    revalidateManga(id);
    return NextResponse.json({ ok: true, removedChapters });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
