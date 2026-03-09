import type { Metadata } from 'next';

export const revalidate = 300; // ISR: revalidar cada 5 minutos (igual que la home)

import MangaGrid from '@/components/manga/MangaGrid';
import { getAllMangas } from '@/lib/data';
import { ALLOWED_GENRES } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Galería — Mangas y Manhwas',
  description:
    'Explora nuestra galería completa de manhwas, mangas y manhuas en español. Filtra por género, tipo y estado.',
};

function tryDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function MangasPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const params = await searchParams;
  const mangas = await getAllMangas();

  // Solo mostrar géneros que estén en la lista preestablecida
  const allowedSet = new Set<string>(ALLOWED_GENRES);
  const genres = Array.from(
    new Set(mangas.flatMap((m) => m.genres).filter((g) => allowedSet.has(g))),
  ).sort();

  const initialGenres = params.genre
    ? [tryDecode(params.genre)].filter((g) => allowedSet.has(g))
    : [];

  return (
    <div className="curva">
      <h1>Galería</h1>
      <MangaGrid mangas={mangas} genres={genres} initialGenres={initialGenres} />
    </div>
  );
}
