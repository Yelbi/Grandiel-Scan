'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useFavoritesContext } from '@/components/providers/FavoritesProvider';
import { useHistoryContext } from '@/components/providers/HistoryProvider';
import { useUserProfile } from '@/components/providers/UserProfileProvider';
import type { Manga } from '@/lib/types';

export default function MangaDetailActions({ manga }: { manga: Manga }) {
  const { isFavorite, toggle } = useFavoritesContext();
  const { getLastRead } = useHistoryContext();
  const { profile } = useUserProfile();
  const [showLoginHint, setShowLoginHint] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fav = isFavorite(manga.id);
  const lastReadChapter = getLastRead(manga.id)?.chapter ?? null;

  useEffect(() => () => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
  }, []);

  const handleFavorite = () => {
    if (!profile) {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      setShowLoginHint(true);
      hintTimerRef.current = setTimeout(() => setShowLoginHint(false), 2500);
      return;
    }
    const msg = fav ? 'Eliminado de favoritos' : 'Agregado a favoritos';
    toggle(manga.id);
    setAnnouncement(msg);
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    announceTimerRef.current = setTimeout(() => setAnnouncement(''), 1500);
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
          <i className={fav ? 'fas fa-heart' : 'far fa-heart'} aria-hidden="true" />
          {fav ? ' En Favoritos' : ' Favoritos'}
        </button>
        {showLoginHint && (
          <span className="favorite-login-hint" role="alert" aria-live="assertive">
            Inicia sesión para guardar favoritos
          </span>
        )}
      </div>
      <span className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </div>
  );
}
