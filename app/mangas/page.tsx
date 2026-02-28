import type { Metadata } from 'next';
import MangaGrid from '@/components/manga/MangaGrid';
import { getAllMangas } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Catálogo de Mangas y Manhwas',
  description:
    'Explora nuestro catálogo completo de manhwas, mangas y manhuas en español. Filtra por género, tipo y estado.',
};

export default async function MangasPage() {
  const mangas = await getAllMangas();

  // Extraer géneros únicos
  const genres = Array.from(
    new Set(mangas.flatMap((m) => m.genres)),
  ).sort();

  return (
    <div className="page-container">
      <h1 className="page-title">Catálogo</h1>
      <MangaGrid mangas={mangas} genres={genres} />
    </div>
  );
}
