'use client';

import { useState, useMemo } from 'react';
import MangaCard from './MangaCard';
import type { Manga, SortOrder } from '@/lib/types';
import { CONFIG } from '@/lib/config';

interface MangaGridProps {
  mangas: Manga[];
  genres?: string[];
}

export default function MangaGrid({ mangas, genres = [] }: MangaGridProps) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [sort, setSort] = useState<SortOrder>('title-asc');
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);

  const ITEMS = CONFIG.PAGINATION.ITEMS_PER_PAGE;

  const filtered = useMemo(() => {
    let result = [...mangas];

    if (selectedGenres.length > 0) {
      result = result.filter((m) =>
        selectedGenres.every((g) => m.genres.includes(g)),
      );
    }
    if (selectedType) {
      result = result.filter((m) => m.type === selectedType);
    }

    switch (sort) {
      case 'title-asc':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title-desc':
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'date-desc':
        result.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
        break;
      case 'date-asc':
        result.sort((a, b) => a.lastUpdated.localeCompare(b.lastUpdated));
        break;
    }

    return result;
  }, [mangas, selectedGenres, selectedType, sort]);

  const totalPages = Math.ceil(filtered.length / ITEMS);
  const paginated = filtered.slice((page - 1) * ITEMS, page * ITEMS);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
    setPage(1);
  };

  return (
    <>
      {/* Filter bar */}
      <div className="filter-bar">
        <button
          className="filter-bar-toggle btn"
          onClick={() => setFilterOpen((o) => !o)}
        >
          <i className="fas fa-filter" /> Filtros
          {(selectedGenres.length > 0 || selectedType) && (
            <span className="filter-badge">
              {selectedGenres.length + (selectedType ? 1 : 0)}
            </span>
          )}
        </button>

        {filterOpen && (
          <div className="filter-controls">
            <div className="filter-section">
              <h4>Géneros</h4>
              <div className="filter-tags">
                {genres.map((genre) => (
                  <button
                    key={genre}
                    className={`filter-tag category_item ${selectedGenres.includes(genre) ? 'active' : ''}`}
                    onClick={() => toggleGenre(genre)}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <h4>Tipo</h4>
              <div className="filter-tags">
                {['Manhwa', 'Manga', 'Manhua'].map((type) => (
                  <button
                    key={type}
                    className={`filter-tag category_item ${selectedType === type ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedType((prev) => (prev === type ? '' : type));
                      setPage(1);
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <h4>Ordenar</h4>
              <div className="filter-tags">
                {(
                  [
                    ['title-asc', 'A-Z'],
                    ['title-desc', 'Z-A'],
                    ['date-desc', 'Más reciente'],
                    ['date-asc', 'Más antiguo'],
                  ] as [SortOrder, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    className={`filter-tag category_item ${sort === value ? 'active' : ''}`}
                    onClick={() => {
                      setSort(value);
                      setPage(1);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn"
              onClick={() => {
                setSelectedGenres([]);
                setSelectedType('');
                setSort('title-asc');
                setPage(1);
              }}
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      <p className="filter-results-count">
        {filtered.length} manga{filtered.length !== 1 ? 's' : ''} encontrado
        {filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Grid */}
      <div className="manga-grid">
        {paginated.map((manga) => (
          <MangaCard key={manga.id} manga={manga} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <i className="fas fa-chevron-left" /> Anterior
          </button>
          <span>
            Página {page} de {totalPages}
          </span>
          <button
            className="btn"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente <i className="fas fa-chevron-right" />
          </button>
        </div>
      )}
    </>
  );
}
