import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { Manga } from '@/lib/types';

const MANGAS_FILE   = path.join(process.cwd(), 'public', 'data', 'mangas.json');
const CHAPTERS_FILE = path.join(process.cwd(), 'public', 'data', 'chapters.json');

function guard() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Solo disponible en desarrollo local.' }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const block = guard();
  if (block) return block;

  const data = JSON.parse(fs.readFileSync(MANGAS_FILE, 'utf-8'));
  return NextResponse.json(data.mangas as Manga[]);
}

export async function POST(req: NextRequest) {
  const block = guard();
  if (block) return block;

  const manga: Manga = await req.json();

  if (!manga.id || !manga.title) {
    return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
  }

  const data = JSON.parse(fs.readFileSync(MANGAS_FILE, 'utf-8'));

  if (data.mangas.find((m: Manga) => m.id === manga.id)) {
    return NextResponse.json({ error: `Ya existe un manga con id "${manga.id}".` }, { status: 409 });
  }

  data.mangas.push(manga);
  fs.writeFileSync(MANGAS_FILE, JSON.stringify(data, null, 2), 'utf-8');

  return NextResponse.json({ ok: true, manga });
}

/* ── Editar manga (no cambia id, chapters, latestChapter) ── */
export async function PATCH(req: NextRequest) {
  const block = guard();
  if (block) return block;

  const { id, ...fields } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requerido.' }, { status: 400 });

  const data = JSON.parse(fs.readFileSync(MANGAS_FILE, 'utf-8'));
  const idx = data.mangas.findIndex((m: Manga) => m.id === id);

  if (idx === -1) {
    return NextResponse.json({ error: `No existe manga con id "${id}".` }, { status: 404 });
  }

  // Campos protegidos que no se pueden sobreescribir desde el form
  const { chapters, latestChapter, ...safeFields } = fields;
  void chapters; void latestChapter;

  data.mangas[idx] = { ...data.mangas[idx], ...safeFields };
  fs.writeFileSync(MANGAS_FILE, JSON.stringify(data, null, 2), 'utf-8');

  return NextResponse.json({ ok: true, manga: data.mangas[idx] });
}

/* ── Eliminar manga + sus capítulos ── */
export async function DELETE(req: NextRequest) {
  const block = guard();
  if (block) return block;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requerido.' }, { status: 400 });

  // Borrar de mangas.json
  const mangasData = JSON.parse(fs.readFileSync(MANGAS_FILE, 'utf-8'));
  const before = mangasData.mangas.length;
  mangasData.mangas = mangasData.mangas.filter((m: Manga) => m.id !== id);

  if (mangasData.mangas.length === before) {
    return NextResponse.json({ error: `No existe manga con id "${id}".` }, { status: 404 });
  }
  fs.writeFileSync(MANGAS_FILE, JSON.stringify(mangasData, null, 2), 'utf-8');

  // Borrar sus capítulos de chapters.json
  const chaptersData = JSON.parse(fs.readFileSync(CHAPTERS_FILE, 'utf-8'));
  const removed = chaptersData.chapters.filter((c: { mangaId: string }) => c.mangaId === id).length;
  chaptersData.chapters = chaptersData.chapters.filter((c: { mangaId: string }) => c.mangaId !== id);
  fs.writeFileSync(CHAPTERS_FILE, JSON.stringify(chaptersData, null, 2), 'utf-8');

  return NextResponse.json({ ok: true, removedChapters: removed });
}
