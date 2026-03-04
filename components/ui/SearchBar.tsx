'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { searchMangas } from '@/lib/search';
import type { Manga } from '@/lib/types';

interface SearchBarProps {
  mangas: Manga[];
}

export default function SearchBar({ mangas }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Manga[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback((q: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (!q.trim()) {
        setResults([]);
        setOpen(false);
        setSelectedIndex(-1);
        return;
      }
      const found = searchMangas(mangas, q)
        .slice(0, 8)
        .map((r) => r.manga);
      setResults(found);
      setOpen(found.length > 0);
      setSelectedIndex(-1);
    }, 300);
  }, [mangas]);

  useEffect(() => {
    doSearch(query);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, doSearch]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Enfocar input al abrir en móvil
  useEffect(() => {
    if (mobileOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [mobileOpen]);

  const closeMobile = () => {
    setMobileOpen(false);
    setOpen(false);
    setQuery('');
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const selected = results[selectedIndex];
      router.push(`/manga/${selected.id}`);
      setOpen(false);
      setQuery('');
      setMobileOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setSelectedIndex(-1);
      if (mobileOpen) closeMobile();
    }
  };

  return (
    <div
      id="ctn-bars-search"
      ref={containerRef}
      className={mobileOpen ? 'mobile-open' : ''}
    >
      {/* Botón ícono — visible solo en móvil cuando está cerrado */}
      <button
        className="search-mobile-btn"
        aria-label="Abrir búsqueda"
        onClick={() => setMobileOpen(true)}
      >
        <i className="fas fa-search" />
      </button>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        id="inputSearch"
        placeholder="¿Qué deseas buscar?"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls="box-search"
        aria-activedescendant={
          selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined
        }
      />

      {/* Ícono derecho: × para cerrar en móvil, lupa en desktop */}
      <div
        id="ctn-icon-search"
        role="button"
        tabIndex={0}
        aria-label={mobileOpen ? 'Cerrar búsqueda' : 'Buscar'}
        onClick={mobileOpen ? closeMobile : undefined}
        onKeyDown={(e) => e.key === 'Enter' && mobileOpen && closeMobile()}
      >
        <i className={`fas fa-${mobileOpen ? 'times' : 'search'}`} />
      </div>

      {/* Resultados */}
      {open && (
        <ul id="box-search" role="listbox">
          {results.map((manga, i) => (
            <li key={manga.id} role="option" aria-selected={i === selectedIndex}>
              <Link
                id={`search-result-${i}`}
                href={`/manga/${manga.id}`}
                className={i === selectedIndex ? 'search-result-active' : ''}
                onClick={() => {
                  setOpen(false);
                  setQuery('');
                  setMobileOpen(false);
                  setSelectedIndex(-1);
                }}
              >
                <div className="search-result-cover">
                  <Image
                    src={manga.image}
                    alt=""
                    width={40}
                    height={56}
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                    unoptimized={manga.image.startsWith('/img/')}
                  />
                </div>
                <div className="search-result-info">
                  <span className="search-result-title">{manga.title}</span>
                  <span className="search-result-type">{manga.type}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
