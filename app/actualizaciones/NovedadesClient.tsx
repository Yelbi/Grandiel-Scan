'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useMemo, memo } from 'react';
import MangaCard from '@/components/manga/MangaCard';
import type { Manga } from '@/lib/types';

type Tab = 'actualizaciones' | 'nuevos';

const MS_DAY   = 86_400_000;
const MS_WEEK  = 7  * MS_DAY;
const MS_MONTH = 30 * MS_DAY;

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / MS_DAY);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7)  return `Hace ${days} días`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `Hace ${w} semana${w !== 1 ? 's' : ''}`;
  }
  return new Date(dateStr).toLocaleDateString('es-ES');
}

const ActCard = memo(function ActCard({ manga }: { manga: Manga }) {
  const [error, setError] = useState(false);
  const href = `/chapter/${manga.id}/${manga.latestChapter}`;

  return (
    <div className="manga-card product-item">
      <Link href={href}>
        <div className="manga-card-inner">
          {!error ? (
            <Image
              src={manga.image}
              alt={manga.title}
              width={200}
              height={280}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              loading="lazy"
              unoptimized={manga.image.startsWith('/img/')}
              onError={() => setError(true)}
            />
          ) : (
            <div
              style={{
                width: '100%', height: '100%', minHeight: '280px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--color-bg-secondary, #1a1a1a)',
                color: 'var(--color-text-secondary, #b0b0b0)', fontSize: '2rem',
              }}
              aria-label={manga.title}
            >
              <i className="fas fa-book" aria-hidden="true" />
            </div>
          )}
          {manga.latestChapter ? (
            <div className="act-card__chapter">Cap. {manga.latestChapter}</div>
          ) : null}
        </div>
        <h3 className="manga-card__title">{manga.title}</h3>
        <div className="manga-meta">
          <span className="manga-chapters">{relativeDate(manga.lastUpdated)}</span>
        </div>
      </Link>
    </div>
  );
});

export default function NovedadesClient({ mangas }: { mangas: Manga[] }) {
  const [tab, setTab] = useState<Tab>('actualizaciones');

  /* ─── Actualizaciones: ordenar y agrupar en un único memo ─── */
  const [byUpdated, updatedToday, updatedThisWeek, updatedOlder] = useMemo(() => {
    const now = Date.now();
    const sorted = [...mangas].sort(
      (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
    );
    const today  = sorted.filter((m) => now - new Date(m.lastUpdated).getTime() < MS_DAY);
    const week   = sorted.filter((m) => { const age = now - new Date(m.lastUpdated).getTime(); return age >= MS_DAY && age < MS_WEEK; });
    const older  = sorted.filter((m) => now - new Date(m.lastUpdated).getTime() >= MS_WEEK);
    return [sorted, today, week, older] as const;
  }, [mangas]);

  /* ─── Nuevos: ordenar y agrupar en un único memo ─── */
  const [byAdded, thisWeek, thisMonth, older] = useMemo(() => {
    const now = Date.now();
    const sorted = [...mangas].sort(
      (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
    );
    const week  = sorted.filter((m) => now - new Date(m.dateAdded).getTime() < MS_WEEK);
    const month = sorted.filter((m) => { const age = now - new Date(m.dateAdded).getTime(); return age >= MS_WEEK && age < MS_MONTH; });
    const old   = sorted.filter((m) => now - new Date(m.dateAdded).getTime() >= MS_MONTH);
    return [sorted, week, month, old] as const;
  }, [mangas]);

  const newCount    = thisWeek.length + thisMonth.length;
  const recentCount = updatedToday.length + updatedThisWeek.length;

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
          aria-controls="panel-actualizaciones"
          className={`novedades-tab${tab === 'actualizaciones' ? ' active' : ''}`}
          onClick={() => setTab('actualizaciones')}
        >
          <i className="fas fa-bell" aria-hidden="true" />
          Actualizaciones
          {recentCount > 0 && (
            <span className="novedades-tab__badge">{recentCount}</span>
          )}
        </button>
        <button
          role="tab"
          aria-selected={tab === 'nuevos'}
          aria-controls="panel-nuevos"
          className={`novedades-tab${tab === 'nuevos' ? ' active' : ''}`}
          onClick={() => setTab('nuevos')}
        >
          <i className="fas fa-star" aria-hidden="true" />
          Nuevos
          {newCount > 0 && (
            <span className="novedades-tab__badge novedades-tab__badge--accent">{newCount}</span>
          )}
        </button>
      </div>

      {/* ══════════════ TAB: ACTUALIZACIONES ══════════════ */}
      <div id="panel-actualizaciones" role="tabpanel" hidden={tab !== 'actualizaciones'}>
        {byUpdated.length === 0 ? (
          <p className="no-results">No hay actualizaciones disponibles.</p>
        ) : (
          <>
            {updatedToday.length > 0 && (
              <section className="nuevos-section">
                <h2 className="nuevos-section__title">
                  <i className="fas fa-fire" aria-hidden="true" /> Hoy
                  <span className="nuevos-section__count">{updatedToday.length} títulos</span>
                </h2>
                <div className="mami">
                  {updatedToday.map((m) => <ActCard key={m.id} manga={m} />)}
                </div>
              </section>
            )}

            {updatedThisWeek.length > 0 && (
              <section className="nuevos-section">
                <h2 className="nuevos-section__title">
                  <i className="fas fa-calendar-week" aria-hidden="true" /> Esta semana
                  <span className="nuevos-section__count">{updatedThisWeek.length} títulos</span>
                </h2>
                <div className="mami">
                  {updatedThisWeek.map((m) => <ActCard key={m.id} manga={m} />)}
                </div>
              </section>
            )}

            {updatedOlder.length > 0 && (
              <section className="nuevos-section nuevos-section--older">
                <h2 className="nuevos-section__title">
                  <i className="fas fa-history" aria-hidden="true" /> Anteriores
                  <span className="nuevos-section__count">{updatedOlder.length} títulos</span>
                </h2>
                <div className="mami">
                  {updatedOlder.map((m) => <ActCard key={m.id} manga={m} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* ══════════════ TAB: NUEVOS ══════════════ */}
      <div id="panel-nuevos" role="tabpanel" hidden={tab !== 'nuevos'}>
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

        {byAdded.length === 0 && (
          <p className="no-results">No hay mangas en el catálogo todavía.</p>
        )}
      </div>

    </div>
  );
}
