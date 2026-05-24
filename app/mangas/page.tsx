import type { Metadata } from 'next';

// force-dynamic: root layout calls headers() for CSP nonce — incompatible with ISR.
// Data queries use unstable_cache internally, so DB performance is preserved.
export const dynamic = 'force-dynamic';

import MangaGrid from '@/components/manga/MangaGrid';
import { getAllMangas } from '@/lib/data';
import { ALLOWED_GENRES } from '@/lib/config';
import type { SortOrder } from '@/lib/types';

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

const ALLOWED_TYPES    = new Set(['Manhwa', 'Manga', 'Manhua']);
const ALLOWED_STATUSES = new Set(['En Emision', 'Finalizado', 'Pausado']);
const ALLOWED_SORTS    = new Set<SortOrder>(['title-asc', 'title-desc', 'date-desc', 'date-asc']);

export default async function MangasPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; type?: string; status?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const mangas = await getAllMangas();

  const allowedSet = new Set<string>(ALLOWED_GENRES);
  const genres = Array.from(
    new Set(mangas.flatMap((m) => m.genres).filter((g) => allowedSet.has(g))),
  ).sort();

  // Soporte para múltiples géneros separados por coma: ?genre=Accion,Romance
  const initialGenres = params.genre
    ? params.genre.split(',').map((g) => tryDecode(g.trim())).filter((g) => allowedSet.has(g))
    : [];

  const rawType = params.type ? tryDecode(params.type) : '';
  const initialType = ALLOWED_TYPES.has(rawType) ? rawType : '';

  const rawStatus = params.status ? tryDecode(params.status) : '';
  const initialStatus = ALLOWED_STATUSES.has(rawStatus) ? rawStatus : '';

  const rawSort = params.sort ? tryDecode(params.sort) : '';
  const initialSort: SortOrder = ALLOWED_SORTS.has(rawSort as SortOrder)
    ? (rawSort as SortOrder)
    : 'title-asc';

  return (
    <div className="curva">
      <h1>Galería</h1>
      <MangaGrid
        mangas={mangas}
        genres={genres}
        initialGenres={initialGenres}
        initialType={initialType}
        initialStatus={initialStatus}
        initialSort={initialSort}
      />
    </div>
  );
}
