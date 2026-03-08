'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useFavoritesContext } from '@/components/providers/FavoritesProvider';
import type { Manga } from '@/lib/types';

const DAYS_NEW = 30;
const DAYS_HOT = 7;

interface MangaCardProps {
  manga: Manga;
  showFavoriteBtn?: boolean;
}

export default function MangaCard({ manga, showFavoriteBtn = true }: MangaCardProps) {
  const { isFavorite, toggle } = useFavoritesContext();
  const fav = isFavorite(manga.id);
  const [isNew, setIsNew] = useState(false);
  const [isHot, setIsHot] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!manga.dateAdded) return;
    const age = Date.now() - new Date(manga.dateAdded).getTime();
    setIsNew(age < DAYS_NEW * 24 * 60 * 60 * 1000);
  }, [manga.dateAdded]);

  useEffect(() => {
    if (!manga.lastUpdated) return;
    const age = Date.now() - new Date(manga.lastUpdated).getTime();
    setIsHot(age < DAYS_HOT * 24 * 60 * 60 * 1000);
  }, [manga.lastUpdated]);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setImgError(true);
    }
  }, []);

  return (
    <div className="manga-card product-item">
      <Link href={`/manga/${manga.id}`}>
        <div className="manga-card-inner">
          {imgError ? (
            <div
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
              aria-label={manga.title}
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
              unoptimized={manga.image.startsWith('/img/')}
              onError={() => setImgError(true)}
            />
          )}
          <div className="manga-card-overlay">
            <span>{manga.type} · {manga.status}</span>
          </div>
          {isNew && (
            <span className="badge-new" aria-label="Nuevo">NUEVO</span>
          )}
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
      </Link>

      {showFavoriteBtn && (
        <button
          className={`favorite-btn ${fav ? 'active' : ''}`}
          aria-label={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          onClick={(e) => {
            e.preventDefault();
            toggle(manga.id);
          }}
        >
          <i className={fav ? 'fas fa-heart' : 'far fa-heart'} />
        </button>
      )}
    </div>
  );
}
