import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { Manga } from '@/lib/types';

const FILE = path.join(process.cwd(), 'public', 'data', 'mangas.json');

function guard() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Solo disponible en desarrollo local.' }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const block = guard();
  if (block) return block;

  const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  return NextResponse.json(data.mangas as Manga[]);
}

export async function POST(req: NextRequest) {
  const block = guard();
  if (block) return block;

  const manga: Manga = await req.json();

  if (!manga.id || !manga.title) {
    return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
  }

  const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));

  if (data.mangas.find((m: Manga) => m.id === manga.id)) {
    return NextResponse.json({ error: `Ya existe un manga con id "${manga.id}".` }, { status: 409 });
  }

  data.mangas.push(manga);
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf-8');

  return NextResponse.json({ ok: true, manga });
}
