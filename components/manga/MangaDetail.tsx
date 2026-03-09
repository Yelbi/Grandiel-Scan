import Image from 'next/image';
import Link from 'next/link';
import MangaComments from './MangaComments';
import MangaDetailActions from './MangaDetailActions';
import MangaChapterList from './MangaChapterList';
import type { Manga } from '@/lib/types';

export default function MangaDetail({ manga }: { manga: Manga }) {
  const statusClass =
    manga.status === 'Finalizado' ? 'manga-badge--done' : 'manga-badge--ongoing';

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
              <strong>Actualizado:</strong>{' '}
              {new Date(manga.lastUpdated).toLocaleDateString('es-ES')}
            </span>
            <span className="manga-info-item">
              <strong>Capítulos:</strong> {manga.chapters.length}
            </span>
          </div>

          {/* Descripción */}
          <p className="manga-header__description">{manga.description}</p>

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
          <div className="chapters-scroll">
            <MangaChapterList manga={manga} />
          </div>
        </div>

        <aside className="manga-lower__side">
          <MangaComments mangaId={manga.id} />
        </aside>
      </div>
    </div>
  );
}
