'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useFavoritesContext } from '@/components/providers/FavoritesProvider';
import type { Manga } from '@/lib/types';

const DAYS_NEW = 30;

interface MangaCardProps {
  manga: Manga;
  showFavoriteBtn?: boolean;
}

export default function MangaCard({ manga, showFavoriteBtn = true }: MangaCardProps) {
  const { isFavorite, toggle } = useFavoritesContext();
  const fav = isFavorite(manga.id);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    if (!manga.dateAdded) return;
    const age = Date.now() - new Date(manga.dateAdded).getTime();
    setIsNew(age < DAYS_NEW * 24 * 60 * 60 * 1000);
  }, [manga.dateAdded]);

  return (
    <div
      className="manga-card product-item"
      data-id={manga.id}
      data-category={manga.genres[0] ?? ''}
      data-category2={manga.genres[1] ?? ''}
      data-category3={manga.genres[2] ?? ''}
      data-tipo={manga.type}
    >
      <Link href={`/manga/${manga.id}`}>
        <div className="manga-card-inner">
          <Image
            src={manga.image}
            alt={manga.title}
            width={200}
            height={280}
            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            loading="lazy"
            unoptimized={manga.image.startsWith('/img/')}
          />
          <div className="manga-card-overlay">
            <span>{manga.type} · {manga.status}</span>
          </div>
          {isNew && (
            <span className="badge-new" aria-label="Nuevo">NUEVO</span>
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
