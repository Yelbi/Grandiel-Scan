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

export async function GET() {
  const block = guard();
  if (block) return block;

  try {
    const data = readFile(MANGAS_FILE);
    return NextResponse.json(data.mangas as Manga[]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const block = guard();
  if (block) return block;

  try {
    const manga: Manga = await req.json();

    if (!manga.id || !manga.title) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    const data = readFile(MANGAS_FILE);

    if (data.mangas.find((m: Manga) => m.id === manga.id)) {
      return NextResponse.json({ error: `Ya existe un manga con id "${manga.id}".` }, { status: 409 });
    }

    data.mangas.push(manga);
    writeFile(MANGAS_FILE, data);

    return NextResponse.json({ ok: true, manga });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ── Editar manga (no cambia id, chapters, latestChapter) ── */
export async function PATCH(req: NextRequest) {
  const block = guard();
  if (block) return block;

  try {
    const { id, ...fields } = await req.json();
    if (!id) return NextResponse.json({ error: 'id requerido.' }, { status: 400 });

    const data = readFile(MANGAS_FILE);
    const idx = data.mangas.findIndex((m: Manga) => m.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: `No existe manga con id "${id}".` }, { status: 404 });
    }

    // Campos protegidos que no se pueden sobreescribir desde el form
    const { chapters, latestChapter, ...safeFields } = fields;
    void chapters; void latestChapter;

    data.mangas[idx] = { ...data.mangas[idx], ...safeFields };
    writeFile(MANGAS_FILE, data);

    return NextResponse.json({ ok: true, manga: data.mangas[idx] });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ── Eliminar manga + sus capítulos ── */
export async function DELETE(req: NextRequest) {
  const block = guard();
  if (block) return block;

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id requerido.' }, { status: 400 });

    // Borrar de mangas.json
    const mangasData = readFile(MANGAS_FILE);
    const before = mangasData.mangas.length;
    mangasData.mangas = mangasData.mangas.filter((m: Manga) => m.id !== id);

    if (mangasData.mangas.length === before) {
      return NextResponse.json({ error: `No existe manga con id "${id}".` }, { status: 404 });
    }
    writeFile(MANGAS_FILE, mangasData);

    // Borrar sus capítulos de chapters.json
    const chaptersData = readFile(CHAPTERS_FILE);
    const removed = chaptersData.chapters.filter((c: { mangaId: string }) => c.mangaId === id).length;
    chaptersData.chapters = chaptersData.chapters.filter((c: { mangaId: string }) => c.mangaId !== id);
    writeFile(CHAPTERS_FILE, chaptersData);

    return NextResponse.json({ ok: true, removedChapters: removed });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
