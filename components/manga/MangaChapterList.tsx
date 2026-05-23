'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useHistoryContext } from '@/components/providers/HistoryProvider';
import type { Manga } from '@/lib/types';

export default function MangaChapterList({ manga }: { manga: Manga }) {
  const { getLastRead } = useHistoryContext();
  const lastReadChapter = getLastRead(manga.id)?.chapter ?? null;

  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [search, setSearch] = useState('');

  const sortedChapters = useMemo(() => {
    const sorted = [...manga.chapters];
    return sortOrder === 'desc' ? sorted.reverse() : sorted;
  }, [manga.chapters, sortOrder]);

  const filteredChapters = useMemo(() => {
    const q = search.trim();
    if (!q) return sortedChapters;
    const num = parseFloat(q);
    if (isNaN(num)) return sortedChapters;
    return sortedChapters.filter((c) => String(c).includes(q));
  }, [sortedChapters, search]);

  return (
    <section className="capitulos" aria-label="Lista de capítulos">
      <div className="chapters-controls">
        <input
          type="search"
          className="chapters-search"
          placeholder="Buscar capítulo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar capítulo por número"
        />
        <button
          className="chapters-sort-btn"
          onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
          aria-label={sortOrder === 'desc' ? 'Ordenar de menor a mayor' : 'Ordenar de mayor a menor'}
          title={sortOrder === 'desc' ? 'Ordenar ascendente' : 'Ordenar descendente'}
        >
          <i
            className={`fas fa-sort-numeric-${sortOrder === 'desc' ? 'down' : 'up'}`}
            aria-hidden="true"
          />
          {sortOrder === 'desc' ? 'Mayor → Menor' : 'Menor → Mayor'}
        </button>
      </div>

      {filteredChapters.length === 0 ? (
        <p className="chapters-no-results">No se encontró el capítulo &quot;{search}&quot;.</p>
      ) : (
        filteredChapters.map((cap) => {
          const isLastRead = lastReadChapter !== null && cap === lastReadChapter;
          return (
            <div key={cap} className={`cap${isLastRead ? ' cap--last-read' : ''}`}>
              <Link
                href={`/chapter/${manga.id}/${cap}`}
                aria-label={`Capítulo ${cap}${isLastRead ? ' — último leído' : ''}`}
              >
                Capítulo {cap}
                {isLastRead && <span className="chapter-badge">Último leído</span>}
              </Link>
            </div>
          );
        })
      )}
    </section>
  );
}
