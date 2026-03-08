'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useFavoritesContext } from '@/components/providers/FavoritesProvider';
import { useHistoryContext } from '@/components/providers/HistoryProvider';
import MangaComments from './MangaComments';
import type { Manga } from '@/lib/types';

interface MangaDetailProps {
  manga: Manga;
}

export default function MangaDetail({ manga }: MangaDetailProps) {
  const { isFavorite, toggle } = useFavoritesContext();
  const { getLastRead } = useHistoryContext();
  const fav = isFavorite(manga.id);
  const lastRead = getLastRead(manga.id);
  const lastReadChapter = lastRead?.chapter ?? null;

  const statusClass =
    manga.status === 'Finalizado' ? 'manga-badge--done' : 'manga-badge--ongoing';

  const firstChapter = manga.chapters[0];

  return (
    <div className="curva">

      {/* ── Header: portada + info completa ── */}
      <div className="manga-header">
        <div className="manga-header__cover">
          <Image
            src={manga.image}
            alt={`Portada de ${manga.title}`}
            width={220}
            height={310}
            sizes="220px"
            className="manga-cover-img manga-cover-glow"
            priority
            unoptimized={manga.image.startsWith('/img/')}
          />
        </div>

        <div className="manga-header__info">
          <h1 className="manga-header__title">{manga.title}</h1>

          {/* Tipo y estado */}
          <div className="manga-badges">
            <span className="manga-badge manga-badge--type">{manga.type}</span>
            <span className={`manga-badge ${statusClass}`}>{manga.status}</span>
          </div>

          {/* Géneros — mismo estilo que filtros de galería */}
          <div className="manga-genres">
            {manga.genres.map((genre) => (
              <Link
                key={genre}
                href={`/mangas?genre=${encodeURIComponent(genre)}`}
                className="filter-tag"
              >
                {genre}
              </Link>
            ))}
          </div>

          {/* Meta */}
          <div className="manga-header__meta">
            <span className="manga-info-item">
              <strong>Actualizado:</strong>{' '}
              {new Date(manga.lastUpdated).toLocaleDateString('es-ES')}
            </span>
            <span className="manga-info-item">
              <strong>Capítulos:</strong> {manga.chapters.length}
            </span>
          </div>

          {/* Descripción dentro del header para llenar el espacio */}
          <p className="manga-header__description">{manga.description}</p>

          {/* Botones de acción */}
          <div className="manga-quick-actions">
            {firstChapter !== undefined && (
              <Link
                href={`/chapter/${manga.id}/${firstChapter}`}
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
            <button
              className={`manga-fav-btn${fav ? ' manga-fav-btn--active' : ''}`}
              onClick={() => toggle(manga.id)}
              aria-label={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              <i className={fav ? 'fas fa-heart' : 'far fa-heart'} />
              {fav ? ' En Favoritos' : ' Favoritos'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Capítulos | Comentarios ── */}
      <div className="manga-lower">
        <div className="manga-lower__main">
          <div className="chapters-header">
            <h2>Capítulos</h2>
            <span className="chapters-count">{manga.chapters.length} capítulos</span>
          </div>
          <div className="chapters-scroll">
            <section className="capitulos" aria-label="Lista de capítulos">
              {[...manga.chapters].reverse().map((cap) => {
                const isLastRead = lastReadChapter !== null && cap === lastReadChapter;
                return (
                  <div key={cap} className={`cap${isLastRead ? ' cap--last-read' : ''}`}>
                    <Link href={`/chapter/${manga.id}/${cap}`}>
                      Capítulo {cap}
                      {isLastRead && (
                        <span className="chapter-badge">Último leído</span>
                      )}
                    </Link>
                  </div>
                );
              })}
            </section>
          </div>
        </div>

        <aside className="manga-lower__side">
          <MangaComments mangaId={manga.id} />
        </aside>
      </div>
    </div>
  );
}
