'use client';

import MangaCard from '@/components/manga/MangaCard';
import { useFavoritesContext } from '@/components/providers/FavoritesProvider';
import type { Manga } from '@/lib/types';

export default function FavoritosClient({ mangas }: { mangas: Manga[] }) {
  const { favorites } = useFavoritesContext();

  const favoriteMangas = mangas.filter((m) => favorites.includes(m.id));

  return (
    <div className="curva">
      <h1>
        <i className="fas fa-heart" /> Mis Favoritos
      </h1>

      {favoriteMangas.length === 0 ? (
        <div className="empty-state">
          <i className="far fa-heart" style={{ fontSize: '3rem', opacity: 0.4 }} />
          <p>No tienes favoritos aún.</p>
          <p>Haz clic en el corazón de cualquier manga para agregarlo aquí.</p>
        </div>
      ) : (
        <>
          <p className="results-counter">
            {favoriteMangas.length} manga{favoriteMangas.length !== 1 ? 's' : ''} en favoritos
          </p>
          <div className="mami">
            {favoriteMangas.map((manga) => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
