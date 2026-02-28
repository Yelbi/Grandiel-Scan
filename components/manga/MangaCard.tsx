'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useFavoritesContext } from '@/components/providers/FavoritesProvider';
import type { Manga } from '@/lib/types';

interface MangaCardProps {
  manga: Manga;
  showFavoriteBtn?: boolean;
}

export default function MangaCard({ manga, showFavoriteBtn = true }: MangaCardProps) {
  const { isFavorite, toggle } = useFavoritesContext();
  const fav = isFavorite(manga.id);

  return (
    <div
      className="manga-card product-item"
      data-id={manga.id}
      data-category={manga.genres[0] ?? ''}
      data-category2={manga.genres[1] ?? ''}
      data-category3={manga.genres[2] ?? ''}
      data-tipo={manga.type}
    >
      <Link href={`/manga/${manga.id}`} className="manga-card-link">
        <div className="manga-card-image">
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
            <span className="manga-card-type">{manga.type}</span>
            <span className={`manga-card-status status-${manga.status.toLowerCase().replace(/\s+/g, '-')}`}>
              {manga.status}
            </span>
          </div>
        </div>
        <div className="manga-card-info">
          <h3 className="manga-card-title">{manga.title}</h3>
          <p className="manga-card-chapters">
            Cap. {manga.latestChapter}
          </p>
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
