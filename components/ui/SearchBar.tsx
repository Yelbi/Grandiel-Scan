'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { debounce, searchMangas } from '@/lib/search';
import type { Manga } from '@/lib/types';

interface SearchBarProps {
  mangas: Manga[];
}

export default function SearchBar({ mangas }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Manga[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const doSearch = debounce((q: string) => {
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const found = searchMangas(mangas, q)
      .slice(0, 8)
      .map((r) => r.manga);
    setResults(found);
    setOpen(found.length > 0);
  }, 300);

  useEffect(() => {
    doSearch(query);
  }, [query, doSearch]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div id="ctn-bars-search" ref={containerRef}>
      <input
        type="text"
        id="inputSearch"
        placeholder="¿Qué deseas buscar?"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      <div id="ctn-icon-search" className="btn">
        <i className="fas fa-search" id="icon-search" />
      </div>

      {open && (
        <ul id="box-search">
          {results.map((manga) => (
            <li key={manga.id}>
              <Link
                href={`/manga/${manga.id}`}
                onClick={() => {
                  setOpen(false);
                  setQuery('');
                }}
              >
                <i className="fas fa-search" />
                {manga.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div
        id="cover-ctn-search"
        onClick={() => setOpen(false)}
        style={{ display: open ? 'block' : 'none' }}
      />
    </div>
  );
}
