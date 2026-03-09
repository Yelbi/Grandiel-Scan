'use client';

import { useState, useMemo, useCallback } from 'react';
import MangaCard from './MangaCard';
import type { Manga, SortOrder } from '@/lib/types';
import { CONFIG } from '@/lib/config';

interface MangaGridProps {
  mangas: Manga[];
  genres?: string[];
  initialGenres?: string[];
}

const SORT_OPTIONS: [SortOrder, string][] = [
  ['title-asc',  'A–Z'],
  ['title-desc', 'Z–A'],
  ['date-desc',  'Más reciente'],
  ['date-asc',   'Más antiguo'],
];

const TYPE_OPTIONS   = ['Manhwa', 'Manga', 'Manhua'] as const;
const STATUS_OPTIONS = ['En Emision', 'Finalizado', 'Pausado'] as const;

export default function MangaGrid({ mangas, genres = [], initialGenres = [] }: MangaGridProps) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialGenres);
  const [selectedType,   setSelectedType]   = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sort,           setSort]           = useState<SortOrder>('title-asc');
  const [page,           setPage]           = useState(1);
  const [filterOpen,     setFilterOpen]     = useState(false);

  const ITEMS = CONFIG.PAGINATION.ITEMS_PER_PAGE;

  const filtered = useMemo(() => {
    let result = [...mangas];

    if (selectedGenres.length > 0)
      result = result.filter((m) => selectedGenres.every((g) => m.genres.includes(g)));
    if (selectedType)
      result = result.filter((m) => m.type === selectedType);
    if (selectedStatus)
      result = result.filter((m) => m.status === selectedStatus);

    switch (sort) {
      case 'title-asc':
        result.sort((a, b) => a.title.localeCompare(b.title, 'es'));
        break;
      case 'title-desc':
        result.sort((a, b) => b.title.localeCompare(a.title, 'es'));
        break;
      case 'date-desc':
        result.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        break;
      case 'date-asc':
        result.sort((a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime());
        break;
    }

    return result;
  }, [mangas, selectedGenres, selectedType, selectedStatus, sort]);

  const totalPages = Math.ceil(filtered.length / ITEMS);
  const paginated  = filtered.slice((page - 1) * ITEMS, page * ITEMS);

  const goToPage = useCallback((p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedGenres([]);
    setSelectedType('');
    setSelectedStatus('');
    setSort('title-asc');
    setPage(1);
  }, []);

  const activeFilterCount = selectedGenres.length + (selectedType ? 1 : 0) + (selectedStatus ? 1 : 0);

  // Números de página con ellipsis para grillas grandes
  const pageNumbers = useMemo((): (number | '…')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  return (
    <>
      {/* ── Filter bar ── */}
      <div className="filter-bar">
        <button
          className={`filter-toggle-btn${filterOpen ? ' is-open' : ''}`}
          aria-label="Abrir filtros"
          aria-expanded={filterOpen}
          onClick={() => setFilterOpen((o) => !o)}
        >
          <i className="fas fa-filter" aria-hidden="true" /> Filtros
          {activeFilterCount > 0 && (
            <span className="filter-active-count">{activeFilterCount}</span>
          )}
        </button>

        {filterOpen && (
          <div className="filter-controls">
            {/* Géneros — fila completa */}
            <div className="filter-section">
              <h4><i className="fas fa-tags" aria-hidden="true" /> Géneros</h4>
              <div className="filter-tags">
                {genres.map((genre) => (
                  <button
                    key={genre}
                    className={`filter-tag${selectedGenres.includes(genre) ? ' active' : ''}`}
                    onClick={() => toggleGenre(genre)}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo · Estado · Ordenar — en cuadrícula */}
            <div className="filter-row">
              <div className="filter-section">
                <h4><i className="fas fa-book" aria-hidden="true" /> Tipo</h4>
                <div className="filter-tags">
                  {TYPE_OPTIONS.map((type) => (
                    <button
                      key={type}
                      className={`filter-tag${selectedType === type ? ' active' : ''}`}
                      onClick={() => { setSelectedType((prev) => (prev === type ? '' : type)); setPage(1); }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-section">
                <h4><i className="fas fa-circle" aria-hidden="true" /> Estado</h4>
                <div className="filter-tags">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      className={`filter-tag${selectedStatus === status ? ' active' : ''}`}
                      onClick={() => { setSelectedStatus((prev) => (prev === status ? '' : status)); setPage(1); }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-section">
                <h4><i className="fas fa-sort" aria-hidden="true" /> Ordenar</h4>
                <div className="filter-tags">
                  {SORT_OPTIONS.map(([value, label]) => (
                    <button
                      key={value}
                      className={`filter-tag${sort === value ? ' active' : ''}`}
                      onClick={() => { setSort(value); setPage(1); }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="filter-footer">
                <button className="filter-clear-btn" onClick={clearFilters}>
                  <i className="fas fa-times" aria-hidden="true" /> Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Results count ── */}
      <p className="results-counter">
        {filtered.length} título{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* ── Grid o empty state ── */}
      {paginated.length === 0 ? (
        <div className="no-results">
          <i className="fas fa-search" aria-hidden="true" />
          <p>No se encontraron títulos con los filtros seleccionados.</p>
          {activeFilterCount > 0 && (
            <button className="btn" onClick={clearFilters}>
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="mami">
          {paginated.map((manga) => (
            <MangaCard key={manga.id} manga={manga} />
          ))}
        </div>
      )}

      {/* ── Paginación numérica ── */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn"
            disabled={page === 1}
            aria-label="Página anterior"
            onClick={() => goToPage(page - 1)}
          >
            <i className="fas fa-chevron-left" aria-hidden="true" />
          </button>

          {pageNumbers.map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
            ) : (
              <button
                key={p}
                className={`pagination-btn${page === p ? ' active' : ''}`}
                aria-label={`Ir a página ${p}`}
                aria-current={page === p ? 'page' : undefined}
                onClick={() => goToPage(p as number)}
              >
                {p}
              </button>
            ),
          )}

          <button
            className="btn"
            disabled={page === totalPages}
            aria-label="Página siguiente"
            onClick={() => goToPage(page + 1)}
          >
            <i className="fas fa-chevron-right" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
