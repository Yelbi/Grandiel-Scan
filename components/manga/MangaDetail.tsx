import Image from 'next/image';
import Link from 'next/link';
import MangaComments from './MangaComments';
import MangaDetailActions from './MangaDetailActions';
import MangaChapterList from './MangaChapterList';
import MangaDescriptionToggle from './MangaDescriptionToggle';
import ViewTracker from './ViewTracker';
import type { Manga } from '@/lib/types';

export default function MangaDetail({ manga }: { manga: Manga }) {
  const statusClass =
    manga.status === 'Finalizado' ? 'manga-badge--done' :
    manga.status === 'Pausado'    ? 'manga-badge--paused' :
                                    'manga-badge--ongoing';

  return (
    <div className="curva">
      <ViewTracker mangaId={manga.id} />

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
            unoptimized={manga.image.startsWith('http')}
          />
        </div>

        <div className="manga-header__info">
          <h1 className="manga-header__title">{manga.title}</h1>

          {/* Tipo y estado */}
          <div className="manga-badges">
            <span className="manga-badge manga-badge--type">{manga.type}</span>
            <span className={`manga-badge ${statusClass}`}>{manga.status}</span>
          </div>

          {/* Géneros */}
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
              <i className="fas fa-calendar-alt" aria-hidden="true" />{' '}
              <strong>Actualizado:</strong>{' '}
              <time dateTime={manga.lastUpdated}>
                {new Date(manga.lastUpdated).toLocaleDateString('es-ES')}
              </time>
            </span>
            <span className="manga-info-item">
              <i className="fas fa-book" aria-hidden="true" />{' '}
              <strong>Capítulos:</strong> {manga.chapters.length}
            </span>
            {manga.views !== undefined && (
              <span className="manga-info-item">
                <i className="fas fa-eye" aria-hidden="true" />{' '}
                <strong>Vistas:</strong> {manga.views.toLocaleString('es-ES')}
              </span>
            )}
          </div>

          {/* Descripción con toggle */}
          <MangaDescriptionToggle description={manga.description} />

          {/* Botones de acción — requieren estado del cliente */}
          <MangaDetailActions manga={manga} />
        </div>
      </div>

      {/* ── Capítulos | Comentarios ── */}
      <div className="manga-lower">
        <div className="manga-lower__main">
          <div className="chapters-header">
            <h2>Capítulos</h2>
            <span className="chapters-count">{manga.chapters.length} capítulos</span>
          </div>
          <MangaChapterList manga={manga} />
        </div>

        <aside className="manga-lower__side" aria-label="Comentarios">
          <MangaComments mangaId={manga.id} />
        </aside>
      </div>
    </div>
  );
}
