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

function readFile(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    throw new Error(`No se pudo leer el archivo: ${path.basename(filePath)}`);
  }
}

function writeFile(filePath: string, data: unknown) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    throw new Error(`No se pudo escribir el archivo: ${path.basename(filePath)}`);
  }
}

/* ── Obtener un capítulo ── */
export async function GET(req: NextRequest) {
  const block = guard();
  if (block) return block;

  try {
    const { searchParams } = new URL(req.url);
    const mangaId = searchParams.get('mangaId');
    const chapter = Number(searchParams.get('chapter'));

    if (!mangaId || !chapter) {
      return NextResponse.json({ error: 'mangaId y chapter requeridos.' }, { status: 400 });
    }

    const data = readFile(CHAPTERS_FILE);
    const found = data.chapters.find(
      (c: Chapter) => c.mangaId === mangaId && c.chapter === chapter,
    );

    if (!found) {
      return NextResponse.json({ error: 'Capítulo no encontrado.' }, { status: 404 });
    }

    return NextResponse.json(found as Chapter);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ── Añadir capítulo ── */
export async function POST(req: NextRequest) {
  const block = guard();
  if (block) return block;

  try {
    const chapter: Chapter = await req.json();

    if (!chapter.mangaId || chapter.chapter == null || !chapter.pages?.length) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    const chaptersData = readFile(CHAPTERS_FILE);

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
    writeFile(CHAPTERS_FILE, chaptersData);

    // Actualizar mangas.json
    const mangasData = readFile(MANGAS_FILE);
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
      writeFile(MANGAS_FILE, mangasData);
    }

    return NextResponse.json({ ok: true, chapter });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ── Editar capítulo (pages y/o baseUrl) ── */
export async function PATCH(req: NextRequest) {
  const block = guard();
  if (block) return block;

  try {
    const { mangaId, chapter: chapterNum, pages, baseUrl } = await req.json();

    if (!mangaId || !chapterNum || !pages?.length) {
      return NextResponse.json({ error: 'mangaId, chapter y pages requeridos.' }, { status: 400 });
    }

    const chaptersData = readFile(CHAPTERS_FILE);
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
    writeFile(CHAPTERS_FILE, chaptersData);

    return NextResponse.json({ ok: true, chapter: chaptersData.chapters[idx] });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ── Eliminar capítulo ── */
export async function DELETE(req: NextRequest) {
  const block = guard();
  if (block) return block;

  try {
    const { mangaId, chapter: chapterNum } = await req.json();

    if (!mangaId || !chapterNum) {
      return NextResponse.json({ error: 'mangaId y chapter requeridos.' }, { status: 400 });
    }

    // Borrar de chapters.json
    const chaptersData = readFile(CHAPTERS_FILE);
    const before = chaptersData.chapters.length;
    chaptersData.chapters = chaptersData.chapters.filter(
      (c: Chapter) => !(c.mangaId === mangaId && c.chapter === chapterNum),
    );
    if (chaptersData.chapters.length === before) {
      return NextResponse.json({ error: 'Capítulo no encontrado.' }, { status: 404 });
    }
    writeFile(CHAPTERS_FILE, chaptersData);

    // Actualizar mangas.json
    const mangasData = readFile(MANGAS_FILE);
    const mIdx = mangasData.mangas.findIndex((m: Manga) => m.id === mangaId);

    if (mIdx !== -1) {
      const manga: Manga = mangasData.mangas[mIdx];
      manga.chapters = manga.chapters.filter((n) => n !== chapterNum).sort((a, b) => a - b);
      manga.latestChapter = manga.chapters.length ? manga.chapters[manga.chapters.length - 1] : 0;
      manga.lastUpdated = new Date().toISOString().split('T')[0];
      mangasData.mangas[mIdx] = manga;
      writeFile(MANGAS_FILE, mangasData);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
