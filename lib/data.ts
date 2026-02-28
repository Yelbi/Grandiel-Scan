import fs from 'fs';
import path from 'path';
import type { Manga, Chapter, MangasData, ChaptersData } from './types';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

function readJson<T>(filename: string): T {
  const filePath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

export async function getAllMangas(): Promise<Manga[]> {
  const data = readJson<MangasData>('mangas.json');
  return data.mangas ?? [];
}

export async function getMangaById(id: string): Promise<Manga | null> {
  const mangas = await getAllMangas();
  return mangas.find((m) => m.id === id) ?? null;
}

export async function getAllChapters(): Promise<Chapter[]> {
  const data = readJson<ChaptersData>('chapters.json');
  return data.chapters ?? [];
}

export async function getChapter(
  mangaId: string,
  cap: number,
): Promise<Chapter | null> {
  const chapters = await getAllChapters();
  return (
    chapters.find((c) => c.mangaId === mangaId && c.chapter === cap) ?? null
  );
}

export async function getChaptersByManga(mangaId: string): Promise<Chapter[]> {
  const chapters = await getAllChapters();
  return chapters
    .filter((c) => c.mangaId === mangaId)
    .sort((a, b) => a.chapter - b.chapter);
}

