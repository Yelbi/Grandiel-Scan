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

export async function POST(req: NextRequest) {
  const block = guard();
  if (block) return block;

  const chapter: Chapter = await req.json();

  if (!chapter.mangaId || !chapter.chapter || !chapter.pages?.length) {
    return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
  }

  // ── 1. Añadir al chapters.json ──
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

  // ── 2. Actualizar mangas.json ──
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
