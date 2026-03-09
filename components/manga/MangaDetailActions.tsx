'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useFavoritesContext } from '@/components/providers/FavoritesProvider';
import { useHistoryContext } from '@/components/providers/HistoryProvider';
import { useUserProfile } from '@/components/providers/UserProfileProvider';
import type { Manga } from '@/lib/types';

export default function MangaDetailActions({ manga }: { manga: Manga }) {
  const { isFavorite, toggle } = useFavoritesContext();
  const { getLastRead } = useHistoryContext();
  const { profile } = useUserProfile();
  const [showLoginHint, setShowLoginHint] = useState(false);

  const fav = isFavorite(manga.id);
  const lastReadChapter = getLastRead(manga.id)?.chapter ?? null;

  const handleFavorite = () => {
    if (!profile) {
      setShowLoginHint(true);
      setTimeout(() => setShowLoginHint(false), 2500);
      return;
    }
    toggle(manga.id);
  };

  return (
    <div className="manga-quick-actions">
      {manga.chapters[0] !== undefined && (
        <Link
          href={`/chapter/${manga.id}/${manga.chapters[0]}`}
          className="manga-action-btn manga-action-btn--primary"
        >
          <i className="fas fa-book-open" aria-hidden="true" /> Leer desde el inicio
        </Link>
      )}
      {lastReadChapter !== null && (
        <Link
          href={`/chapter/${manga.id}/${lastReadChapter}`}
          className="manga-action-btn manga-action-btn--secondary"
        >
          <i className="fas fa-redo" aria-hidden="true" /> Continuar · Cap. {lastReadChapter}
        </Link>
      )}
      <div className="favorite-btn-wrapper">
        <button
          className={`manga-fav-btn${fav ? ' manga-fav-btn--active' : ''}`}
          onClick={handleFavorite}
          aria-label={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          <i className={fav ? 'fas fa-heart' : 'far fa-heart'} />
          {fav ? ' En Favoritos' : ' Favoritos'}
        </button>
        {showLoginHint && (
          <span className="favorite-login-hint" role="alert">
            Inicia sesión para guardar favoritos
          </span>
        )}
      </div>
    </div>
  );
}
