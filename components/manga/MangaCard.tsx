'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useFavoritesContext } from '@/components/providers/FavoritesProvider';
import { useUserProfile } from '@/components/providers/UserProfileProvider';
import type { Manga } from '@/lib/types';

const DAYS_NEW = 30;
const DAYS_HOT = 7;

interface MangaCardProps {
  manga: Manga;
  showFavoriteBtn?: boolean;
}

export default function MangaCard({ manga, showFavoriteBtn = true }: MangaCardProps) {
  const { isFavorite, toggle } = useFavoritesContext();
  const { profile } = useUserProfile();
  const fav = isFavorite(manga.id);
  const [imgError, setImgError] = useState(false);
  const [showLoginHint, setShowLoginHint] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  // F-4: mounted flag prevents hydration mismatch on date-based badges
  const [mounted, setMounted] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintId = `login-hint-${manga.id}`;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setImgError(true);
  }, []);

  useEffect(() => () => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
  }, []);

  // F-4: computed only after mount — server always renders false, no hydration mismatch
  const isNew = mounted && !!manga.dateAdded &&
    Date.now() - new Date(manga.dateAdded).getTime() < DAYS_NEW * 864e5;
  const isHot = mounted && !!manga.lastUpdated &&
    Date.now() - new Date(manga.lastUpdated).getTime() < DAYS_HOT * 864e5;

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!profile) {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      setShowLoginHint(true);
      hintTimerRef.current = setTimeout(() => setShowLoginHint(false), 4000);
      return;
    }
    // A-7: fav reflects pre-toggle state, so message is the result of the action
    const msg = fav ? 'Eliminado de favoritos' : 'Agregado a favoritos';
    toggle(manga.id);
    setAnnouncement(msg);
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    announceTimerRef.current = setTimeout(() => setAnnouncement(''), 1500);
  };

  const statusMod =
    manga.status === 'En Emision' ? 'ongoing' :
    manga.status === 'Finalizado' ? 'done' : 'paused';

  return (
    <div className="manga-card product-item">
      <Link href={`/manga/${manga.id}`}>
        <div className="manga-card-inner">
          {imgError ? (
            <div
              role="img"
              aria-label={manga.title}
              style={{
                width: '100%',
                height: '100%',
                minHeight: '280px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-bg-secondary, #1a1a1a)',
                color: 'var(--color-text-secondary, #b0b0b0)',
                fontSize: '2rem',
              }}
            >
              <i className="fas fa-book" aria-hidden="true" />
            </div>
          ) : (
            <Image
              ref={imgRef}
              src={manga.image}
              alt={manga.title}
              width={200}
              height={280}
              sizes="(max-width: 480px) 140px, 200px"
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              loading="lazy"
              unoptimized={manga.image.startsWith('http')}
              onError={() => setImgError(true)}
            />
          )}
          {/* Overlay decorativo — aria-hidden porque el estado se muestra en manga-status-line */}
          <div className="manga-card-overlay" aria-hidden="true">
            <span>{manga.status}</span>
          </div>
          {isNew && <span className="badge-new" aria-label="Nuevo">NUEVO</span>}
          {isHot && (
            <span className="badge-hot" aria-label="Actualizado recientemente">
              <i className="fas fa-fire" aria-hidden="true" />
            </span>
          )}
        </div>
        <h3 className="manga-card__title">{manga.title}</h3>
        <div className="manga-meta">
          <span className="manga-type">{manga.type}</span>
          <span className="manga-chapters">Cap. {manga.latestChapter}</span>
        </div>
        {/* F-7: estado siempre visible (no solo en hover), accesible en táctil */}
        <p className={`manga-status-line manga-status-line--${statusMod}`}>
          {manga.status}
        </p>
      </Link>

      {showFavoriteBtn && (
        <div className="favorite-btn-wrapper">
          <button
            className={`favorite-btn${fav ? ' active' : ''}`}
            aria-label={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            aria-describedby={showLoginHint ? hintId : undefined}
            onClick={handleFavorite}
          >
            <i className={fav ? 'fas fa-heart' : 'far fa-heart'} aria-hidden="true" />
          </button>
          {showLoginHint && (
            // A-4: role="alert" + aria-live para hints activados por click (no hover)
            <div id={hintId} className="favorite-login-hint" role="alert" aria-live="polite">
              <i className="fas fa-lock" aria-hidden="true" /> Inicia sesión
            </div>
          )}
        </div>
      )}

      {/* A-7: región live que anuncia el resultado del toggle de favorito */}
      <span className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </div>
  );
}
