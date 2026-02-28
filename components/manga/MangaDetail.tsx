'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useFavoritesContext } from '@/components/providers/FavoritesProvider';
import type { Manga } from '@/lib/types';

interface MangaDetailProps {
  manga: Manga;
}

export default function MangaDetail({ manga }: MangaDetailProps) {
  const { isFavorite, toggle } = useFavoritesContext();
  const fav = isFavorite(manga.id);

  return (
    <div className="manga-detail">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Inicio</Link>
        <span> / </span>
        <Link href="/mangas">Mangas</Link>
        <span> / </span>
        <span aria-current="page">{manga.title}</span>
      </nav>

      <div className="manga-detail-header">
        {/* Portada */}
        <div className="manga-cover-container">
          <Image
            src={manga.image}
            alt={`Portada de ${manga.title}`}
            width={250}
            height={350}
            style={{ objectFit: 'cover' }}
            priority
            unoptimized={manga.image.startsWith('/img/')}
          />
        </div>

        {/* Info */}
        <div className="manga-info">
          <h1 id="manga-title">{manga.title}</h1>

          {/* Favorite button */}
          <div id="manga-favorite-container">
            <button
              className={`favorite-btn ${fav ? 'active' : ''}`}
              onClick={() => toggle(manga.id)}
              aria-label={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              <i className={fav ? 'fas fa-heart' : 'far fa-heart'} />
              {fav ? ' En Favoritos' : ' Agregar a Favoritos'}
            </button>
          </div>

          {/* Badges */}
          <div className="manga-badges">
            <span className="badge badge-type">{manga.type}</span>
            <span className="badge badge-status">{manga.status}</span>
          </div>

          {/* Géneros */}
          <div className="manga-genres">
            {manga.genres.map((genre) => (
              <span key={genre} className="genre-tag">
                {genre}
              </span>
            ))}
          </div>

          {/* Descripción */}
          <p id="manga-description" className="manga-description">
            {manga.description}
          </p>

          {/* Metadatos */}
          <div className="manga-meta">
            <p>
              <strong>Actualizado:</strong>{' '}
              {new Date(manga.lastUpdated).toLocaleDateString('es-ES')}
            </p>
            <p>
              <strong>Último capítulo:</strong> {manga.latestChapter}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de capítulos */}
      <div className="chapters-section">
        <h2>Capítulos</h2>
        <ul className="chapters-list">
          {[...manga.chapters].reverse().map((cap) => (
            <li key={cap} className="chapter-item">
              <Link href={`/chapter/${manga.id}/${cap}`}>
                <span className="chapter-number">Capítulo {cap}</span>
                <i className="fas fa-book-reader" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
