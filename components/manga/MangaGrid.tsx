'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import MangaCard from './MangaCard';
import type { Manga, SortOrder } from '@/lib/types';
import { CONFIG } from '@/lib/config';
import { normalizeText } from '@/lib/search';

interface MangaGridProps {
  mangas: Manga[];
  genres?: string[];
  initialGenres?: string[];
  initialType?: string;
  initialStatus?: string;
  initialSort?: SortOrder;
}

const SORT_OPTIONS: [SortOrder, string][] = [
  ['title-asc',  'A–Z'],
  ['title-desc', 'Z–A'],
  ['date-desc',  'Más reciente'],
  ['date-asc',   'Más antiguo'],
];

const TYPE_OPTIONS   = ['Manhwa', 'Manga', 'Manhua'] as const;
const STATUS_OPTIONS = ['En Emision', 'Finalizado', 'Pausado'] as const;

export default function MangaGrid({
  mangas,
  genres = [],
  initialGenres = [],
  initialType = '',
  initialStatus = '',
  initialSort = 'title-asc',
}: MangaGridProps) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialGenres);
  const [selectedType,   setSelectedType]   = useState(initialType);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [sort,           setSort]           = useState<SortOrder>(initialSort);
  const [page,           setPage]           = useState(1);
  const [filterOpen,     setFilterOpen]     = useState(false);
  const [genreQuery,     setGenreQuery]     = useState('');

  const ITEMS = CONFIG.PAGINATION.ITEMS_PER_PAGE;

  const barRef       = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef     = useRef<HTMLDivElement>(null);

  // F-1: sync filter state to URL for shareable/bookmarkable views
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedGenres.length > 0) params.set('genre', selectedGenres.join(','));
    if (selectedType)              params.set('type', selectedType);
    if (selectedStatus)            params.set('status', selectedStatus);
    if (sort !== 'title-asc')      params.set('sort', sort);
    const qs = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
  }, [selectedGenres, selectedType, selectedStatus, sort]);

  // F-2: Escape closes the panel and returns focus to the toggle button
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && filterOpen) {
        setFilterOpen(false);
        toggleBtnRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filterOpen]);

  // F-3: click/tap outside the filter bar closes the panel
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (filterOpen && barRef.current && !barRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [filterOpen]);

  // A-3: move focus to first focusable element in panel when it opens
  useEffect(() => {
    if (filterOpen) {
      requestAnimationFrame(() => {
        const first = panelRef.current?.querySelector<HTMLElement>(
          'input, button, [tabindex]:not([tabindex="-1"])',
        );
        first?.focus();
      });
    }
  }, [filterOpen]);

  // F-6: filter the genre list by the search query
  const filteredGenres = useMemo(() => {
    if (!genreQuery.trim()) return genres;
    const q = normalizeText(genreQuery);
    return genres.filter((g) => normalizeText(g).includes(q));
  }, [genres, genreQuery]);

  const filtered = useMemo(() => {
    let result = [...mangas];
    if (selectedGenres.length > 0)
      result = result.filter((m) => selectedGenres.every((g) => m.genres.includes(g)));
    if (selectedType)
      result = result.filter((m) => m.type === selectedType);
    if (selectedStatus)
      result = result.filter((m) => m.status === selectedStatus);

    switch (sort) {
      case 'title-asc':  result.sort((a, b) => a.title.localeCompare(b.title, 'es')); break;
      case 'title-desc': result.sort((a, b) => b.title.localeCompare(a.title, 'es')); break;
      case 'date-desc':  result.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()); break;
      case 'date-asc':   result.sort((a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()); break;
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
    setGenreQuery('');
  }, []);

  const activeFilterCount =
    selectedGenres.length +
    (selectedType ? 1 : 0) +
    (selectedStatus ? 1 : 0) +
    (sort !== 'title-asc' ? 1 : 0);

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
      <div className="filter-bar" ref={barRef}>
        {/* A-1: aria-label dinámico refleja la acción del próximo click */}
        <button
          ref={toggleBtnRef}
          className={`filter-toggle-btn${filterOpen ? ' is-open' : ''}`}
          aria-label={filterOpen ? 'Cerrar filtros' : 'Abrir filtros'}
          aria-expanded={filterOpen}
          aria-controls="filter-panel"
          onClick={() => setFilterOpen((o) => !o)}
        >
          <i className="fas fa-filter" aria-hidden="true" /> Filtros
          {activeFilterCount > 0 && (
            <span
              className="filter-active-count"
              aria-label={`${activeFilterCount} filtro${activeFilterCount !== 1 ? 's' : ''} activo${activeFilterCount !== 1 ? 's' : ''}`}
            >
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* D-7: chips de filtros activos visibles sin abrir el panel */}
        {activeFilterCount > 0 && (
          <div className="filter-active-chips" aria-label="Filtros activos">
            {selectedGenres.map((g) => (
              <button key={g} className="filter-chip" onClick={() => toggleGenre(g)}>
                {g} <span aria-hidden="true">×</span>
                <span className="visually-hidden">Quitar filtro {g}</span>
              </button>
            ))}
            {selectedType && (
              <button className="filter-chip" onClick={() => { setSelectedType(''); setPage(1); }}>
                {selectedType} <span aria-hidden="true">×</span>
                <span className="visually-hidden">Quitar filtro {selectedType}</span>
              </button>
            )}
            {selectedStatus && (
              <button className="filter-chip" onClick={() => { setSelectedStatus(''); setPage(1); }}>
                {selectedStatus} <span aria-hidden="true">×</span>
                <span className="visually-hidden">Quitar filtro {selectedStatus}</span>
              </button>
            )}
            {sort !== 'title-asc' && (
              <button className="filter-chip" onClick={() => { setSort('title-asc'); setPage(1); }}>
                {SORT_OPTIONS.find(([v]) => v === sort)?.[1]} <span aria-hidden="true">×</span>
                <span className="visually-hidden">Quitar orden</span>
              </button>
            )}
          </div>
        )}

        {filterOpen && (
          <div className="filter-controls" id="filter-panel" ref={panelRef}>
            {/* Géneros — con búsqueda si hay más de 10 (F-6) */}
            <div className="filter-section">
              <h4 id="filter-genre-label">
                <i className="fas fa-tags" aria-hidden="true" /> Géneros
              </h4>
              {genres.length > 10 && (
                <input
                  type="search"
                  className="filter-genre-search"
                  placeholder="Buscar género…"
                  value={genreQuery}
                  onChange={(e) => setGenreQuery(e.target.value)}
                  aria-label="Buscar género"
                />
              )}
              {/* A-5: role="group" + aria-labelledby asocia el grupo al h4 */}
              <div className="filter-tags" role="group" aria-labelledby="filter-genre-label">
                {filteredGenres.map((genre) => (
                  <button
                    key={genre}
                    className={`filter-tag${selectedGenres.includes(genre) ? ' active' : ''}`}
                    aria-pressed={selectedGenres.includes(genre)}
                    onClick={() => toggleGenre(genre)}
                  >
                    {genre}
                  </button>
                ))}
                {filteredGenres.length === 0 && (
                  <p className="filter-no-genres">Sin resultados para &quot;{genreQuery}&quot;</p>
                )}
              </div>
            </div>

            {/* Tipo · Estado · Ordenar */}
            <div className="filter-row">
              <div className="filter-section">
                <h4 id="filter-type-label">
                  <i className="fas fa-book" aria-hidden="true" /> Tipo
                </h4>
                <div className="filter-tags" role="group" aria-labelledby="filter-type-label">
                  {TYPE_OPTIONS.map((type) => (
                    <button
                      key={type}
                      className={`filter-tag${selectedType === type ? ' active' : ''}`}
                      aria-pressed={selectedType === type}
                      onClick={() => { setSelectedType((prev) => (prev === type ? '' : type)); setPage(1); }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-section">
                <h4 id="filter-status-label">
                  <i className="fas fa-circle" aria-hidden="true" /> Estado
                </h4>
                <div className="filter-tags" role="group" aria-labelledby="filter-status-label">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      className={`filter-tag${selectedStatus === status ? ' active' : ''}`}
                      aria-pressed={selectedStatus === status}
                      onClick={() => { setSelectedStatus((prev) => (prev === status ? '' : status)); setPage(1); }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-section">
                <h4 id="filter-sort-label">
                  <i className="fas fa-sort" aria-hidden="true" /> Ordenar
                </h4>
                <div className="filter-tags" role="group" aria-labelledby="filter-sort-label">
                  {SORT_OPTIONS.map(([value, label]) => (
                    <button
                      key={value}
                      className={`filter-tag${sort === value ? ' active' : ''}`}
                      aria-pressed={sort === value}
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

      {/* A-6: role="status" anuncia cambios de conteo a lectores de pantalla */}
      <p className="results-counter" role="status" aria-live="polite">
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
        <div className="manga-grid">
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
