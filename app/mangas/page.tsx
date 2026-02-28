import type { Metadata } from 'next';
import MangaGrid from '@/components/manga/MangaGrid';
import { getAllMangas } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Galería — Mangas y Manhwas',
  description:
    'Explora nuestra galería completa de manhwas, mangas y manhuas en español. Filtra por género, tipo y estado.',
};

export default async function MangasPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const params = await searchParams;
  const mangas = await getAllMangas();

  const genres = Array.from(
    new Set(mangas.flatMap((m) => m.genres)),
  ).sort();

  const initialGenres = params.genre
    ? [decodeURIComponent(params.genre)]
    : [];

  return (
    <div className="curva">
      <h1>Galería</h1>
      <MangaGrid mangas={mangas} genres={genres} initialGenres={initialGenres} />
    </div>
  );
}
