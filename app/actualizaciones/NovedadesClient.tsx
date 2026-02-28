'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import MangaCard from '@/components/manga/MangaCard';
import type { Manga } from '@/lib/types';

type Tab = 'actualizaciones' | 'nuevos';

const MS_WEEK  = 7  * 24 * 60 * 60 * 1000;
const MS_MONTH = 30 * 24 * 60 * 60 * 1000;

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7)  return `Hace ${days} días`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `Hace ${w} semana${w !== 1 ? 's' : ''}`;
  }
  return new Date(dateStr).toLocaleDateString('es-ES');
}

export default function NovedadesClient({ mangas }: { mangas: Manga[] }) {
  const [tab, setTab] = useState<Tab>('actualizaciones');

  /* ─── Actualizaciones: ordenar por última actualización ─── */
  const byUpdated = [...mangas].sort((a, b) =>
    b.lastUpdated.localeCompare(a.lastUpdated),
  );

  /* ─── Nuevos: ordenar y agrupar por fecha de añadido ─── */
  const byAdded = [...mangas].sort((a, b) =>
    b.dateAdded.localeCompare(a.dateAdded),
  );
  const now = Date.now();
  const thisWeek  = byAdded.filter((m) => now - new Date(m.dateAdded).getTime() < MS_WEEK);
  const thisMonth = byAdded.filter((m) => {
    const age = now - new Date(m.dateAdded).getTime();
    return age >= MS_WEEK && age < MS_MONTH;
  });
  const older = byAdded.filter((m) => now - new Date(m.dateAdded).getTime() >= MS_MONTH);
  const newCount = thisWeek.length + thisMonth.length;

  return (
    <div className="curva">

      {/* ── Cabecera de página ── */}
      <div className="novedades-header">
        <h1 className="novedades-header__title">
          <i className="fas fa-newspaper" aria-hidden="true" /> Novedades
        </h1>
        <p className="novedades-header__sub">
          Últimas actualizaciones y nuevos títulos del catálogo
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="novedades-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'actualizaciones'}
          className={`novedades-tab${tab === 'actualizaciones' ? ' active' : ''}`}
          onClick={() => setTab('actualizaciones')}
        >
          <i className="fas fa-bell" aria-hidden="true" />
          Actualizaciones
          <span className="novedades-tab__badge">{byUpdated.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === 'nuevos'}
          className={`novedades-tab${tab === 'nuevos' ? ' active' : ''}`}
          onClick={() => setTab('nuevos')}
        >
          <i className="fas fa-star" aria-hidden="true" />
          Nuevos
          {newCount > 0 && (
            <span className="novedades-tab__badge novedades-tab__badge--accent">
              {newCount}
            </span>
          )}
        </button>
      </div>

      {/* ══════════════ TAB: ACTUALIZACIONES ══════════════ */}
      {tab === 'actualizaciones' && (
        <ul className="history-list">
          {byUpdated.map((manga) => (
            <li key={manga.id} className="history-entry">
              <div className="history-cover">
                <Link href={`/manga/${manga.id}`}>
                  <Image
                    src={manga.image}
                    alt={manga.title}
                    width={60}
                    height={80}
                    style={{ objectFit: 'cover' }}
                    loading="lazy"
                    unoptimized={manga.image.startsWith('/img/')}
                  />
                </Link>
              </div>
              <div className="history-info">
                <Link href={`/manga/${manga.id}`}>
                  <strong>{manga.title}</strong>
                </Link>
                <p>
                  Último cap.:{' '}
                  <Link href={`/chapter/${manga.id}/${manga.latestChapter}`}>
                    Cap. {manga.latestChapter}
                  </Link>
                </p>
                <small>{relativeDate(manga.lastUpdated)}</small>
              </div>
              <Link
                href={`/chapter/${manga.id}/${manga.latestChapter}`}
                className="btn"
              >
                Leer
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* ══════════════ TAB: NUEVOS ══════════════ */}
      {tab === 'nuevos' && (
        <div>
          {/* Sub-cabecera */}
          <div className="nuevos-header">
            <div className="nuevos-header__icon">
              <i className="fas fa-star" aria-hidden="true" />
            </div>
            <div className="nuevos-header__text">
              <h2 className="nuevos-header__title">Nuevos Mangas</h2>
              <p className="nuevos-header__subtitle">
                {newCount > 0
                  ? `${newCount} título${newCount !== 1 ? 's' : ''} añadido${newCount !== 1 ? 's' : ''} en los últimos 30 días`
                  : 'Todos los mangas ordenados por fecha de incorporación'}
              </p>
            </div>
            {newCount > 0 && (
              <span className="nuevos-header__badge">{newCount} nuevos</span>
            )}
          </div>

          {thisWeek.length > 0 && (
            <section className="nuevos-section">
              <h2 className="nuevos-section__title">
                <i className="fas fa-fire" aria-hidden="true" /> Esta semana
                <span className="nuevos-section__count">{thisWeek.length} títulos</span>
              </h2>
              <div className="mami">
                {thisWeek.map((manga) => <MangaCard key={manga.id} manga={manga} />)}
              </div>
            </section>
          )}

          {thisMonth.length > 0 && (
            <section className="nuevos-section">
              <h2 className="nuevos-section__title">
                <i className="fas fa-calendar-alt" aria-hidden="true" /> Este mes
                <span className="nuevos-section__count">{thisMonth.length} títulos</span>
              </h2>
              <div className="mami">
                {thisMonth.map((manga) => <MangaCard key={manga.id} manga={manga} />)}
              </div>
            </section>
          )}

          {older.length > 0 && (
            <section className="nuevos-section nuevos-section--older">
              <h2 className="nuevos-section__title">
                <i className="fas fa-history" aria-hidden="true" /> Anteriores
                <span className="nuevos-section__count">{older.length} títulos</span>
              </h2>
              <div className="mami">
                {older.map((manga) => <MangaCard key={manga.id} manga={manga} />)}
              </div>
            </section>
          )}
        </div>
      )}

    </div>
  );
}
