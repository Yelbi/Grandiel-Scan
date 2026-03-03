import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { Chapter, Manga } from '@/lib/types';

const CHAPTERS_FILE = path.join(process.cwd(), 'public', 'data', 'chapters.json');
const MANGAS_FILE   = path.join(process.cwd(), 'public', 'data', 'mangas.json');

function guard() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Solo disponible en desarrollo local.' }, { status: 403 });
  }
  return null;
}

/* ── Obtener un capítulo ── */
export async function GET(req: NextRequest) {
  const block = guard();
  if (block) return block;

  const { searchParams } = new URL(req.url);
  const mangaId = searchParams.get('mangaId');
  const chapter = Number(searchParams.get('chapter'));

  if (!mangaId || !chapter) {
    return NextResponse.json({ error: 'mangaId y chapter requeridos.' }, { status: 400 });
  }

  const data = JSON.parse(fs.readFileSync(CHAPTERS_FILE, 'utf-8'));
  const found = data.chapters.find(
    (c: Chapter) => c.mangaId === mangaId && c.chapter === chapter,
  );

  if (!found) {
    return NextResponse.json({ error: 'Capítulo no encontrado.' }, { status: 404 });
  }

  return NextResponse.json(found as Chapter);
}

/* ── Añadir capítulo ── */
export async function POST(req: NextRequest) {
  const block = guard();
  if (block) return block;

  const chapter: Chapter = await req.json();

  if (!chapter.mangaId || chapter.chapter == null || !chapter.pages?.length) {
    return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
  }

  const chaptersData = JSON.parse(fs.readFileSync(CHAPTERS_FILE, 'utf-8'));

  const duplicate = chaptersData.chapters.find(
    (c: Chapter) => c.mangaId === chapter.mangaId && c.chapter === chapter.chapter,
  );
  if (duplicate) {
    return NextResponse.json(
      { error: `El capítulo ${chapter.chapter} de "${chapter.mangaId}" ya existe.` },
      { status: 409 },
    );
  }

  chaptersData.chapters.push(chapter);
  fs.writeFileSync(CHAPTERS_FILE, JSON.stringify(chaptersData, null, 2), 'utf-8');

  // Actualizar mangas.json
  const mangasData = JSON.parse(fs.readFileSync(MANGAS_FILE, 'utf-8'));
  const idx = mangasData.mangas.findIndex((m: Manga) => m.id === chapter.mangaId);

  if (idx !== -1) {
    const manga: Manga = mangasData.mangas[idx];
    if (!manga.chapters.includes(chapter.chapter)) {
      manga.chapters = [...manga.chapters, chapter.chapter].sort((a, b) => a - b);
    }
    if (chapter.chapter >= manga.latestChapter) {
      manga.latestChapter = chapter.chapter;
      manga.lastUpdated = new Date().toISOString().split('T')[0];
    }
    mangasData.mangas[idx] = manga;
    fs.writeFileSync(MANGAS_FILE, JSON.stringify(mangasData, null, 2), 'utf-8');
  }

  return NextResponse.json({ ok: true, chapter });
}

/* ── Editar capítulo (pages y/o baseUrl) ── */
export async function PATCH(req: NextRequest) {
  const block = guard();
  if (block) return block;

  const { mangaId, chapter: chapterNum, pages, baseUrl } = await req.json();

  if (!mangaId || !chapterNum || !pages?.length) {
    return NextResponse.json({ error: 'mangaId, chapter y pages requeridos.' }, { status: 400 });
  }

  const chaptersData = JSON.parse(fs.readFileSync(CHAPTERS_FILE, 'utf-8'));
  const idx = chaptersData.chapters.findIndex(
    (c: Chapter) => c.mangaId === mangaId && c.chapter === chapterNum,
  );

  if (idx === -1) {
    return NextResponse.json({ error: 'Capítulo no encontrado.' }, { status: 404 });
  }

  chaptersData.chapters[idx] = {
    ...chaptersData.chapters[idx],
    pages,
    ...(baseUrl !== undefined ? { baseUrl } : {}),
  };
  fs.writeFileSync(CHAPTERS_FILE, JSON.stringify(chaptersData, null, 2), 'utf-8');

  return NextResponse.json({ ok: true, chapter: chaptersData.chapters[idx] });
}

/* ── Eliminar capítulo ── */
export async function DELETE(req: NextRequest) {
  const block = guard();
  if (block) return block;

  const { mangaId, chapter: chapterNum } = await req.json();

  if (!mangaId || !chapterNum) {
    return NextResponse.json({ error: 'mangaId y chapter requeridos.' }, { status: 400 });
  }

  // Borrar de chapters.json
  const chaptersData = JSON.parse(fs.readFileSync(CHAPTERS_FILE, 'utf-8'));
  const before = chaptersData.chapters.length;
  chaptersData.chapters = chaptersData.chapters.filter(
    (c: Chapter) => !(c.mangaId === mangaId && c.chapter === chapterNum),
  );
  if (chaptersData.chapters.length === before) {
    return NextResponse.json({ error: 'Capítulo no encontrado.' }, { status: 404 });
  }
  fs.writeFileSync(CHAPTERS_FILE, JSON.stringify(chaptersData, null, 2), 'utf-8');

  // Actualizar mangas.json
  const mangasData = JSON.parse(fs.readFileSync(MANGAS_FILE, 'utf-8'));
  const mIdx = mangasData.mangas.findIndex((m: Manga) => m.id === mangaId);

  if (mIdx !== -1) {
    const manga: Manga = mangasData.mangas[mIdx];
    manga.chapters = manga.chapters.filter((n) => n !== chapterNum).sort((a, b) => a - b);
    manga.latestChapter = manga.chapters.length ? manga.chapters[manga.chapters.length - 1] : 0;
    manga.lastUpdated = new Date().toISOString().split('T')[0];
    mangasData.mangas[mIdx] = manga;
    fs.writeFileSync(MANGAS_FILE, JSON.stringify(mangasData, null, 2), 'utf-8');
  }

  return NextResponse.json({ ok: true });
}
