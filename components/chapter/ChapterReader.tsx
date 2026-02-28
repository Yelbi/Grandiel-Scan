'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useHistoryContext } from '@/components/providers/HistoryProvider';
import type { Chapter, Manga, ReadingMode } from '@/lib/types';
import { resolvePageUrl } from '@/lib/utils';
import { CONFIG } from '@/lib/config';

interface ChapterReaderProps {
  manga: Manga;
  chapter: Chapter;
  prevCap: number | null;
  nextCap: number | null;
}

export default function ChapterReader({
  manga,
  chapter,
  prevCap,
  nextCap,
}: ChapterReaderProps) {
  const { addEntry } = useHistoryContext();
  const [mode, setMode] = useState<ReadingMode>('paginated');
  const [currentPage, setCurrentPage] = useState(0);
  const pages = chapter.pages.map((p) => resolvePageUrl(chapter, p));

  // Guardar en historial al entrar al capítulo
  useEffect(() => {
    addEntry({
      mangaId: manga.id,
      chapter: chapter.chapter,
      timestamp: Date.now(),
      title: manga.title,
    });
  }, [manga.id, manga.title, chapter.chapter, addEntry]);

  // Leer modo guardado
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.READING_MODE);
      if (stored === 'paginated' || stored === 'continuous') setMode(stored);
    } catch {}
  }, []);

  const saveMode = useCallback((m: ReadingMode) => {
    setMode(m);
    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.READING_MODE, m);
    } catch {}
  }, []);

  // Navegación por teclado
  useEffect(() => {
    if (mode !== 'paginated') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setCurrentPage((p) => Math.min(p + 1, pages.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrentPage((p) => Math.max(p - 1, 0));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode, pages.length]);

  return (
    <div className="chapter-reader">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Inicio</Link>
        <span> / </span>
        <Link href={`/manga/${manga.id}`}>{manga.title}</Link>
        <span> / </span>
        <span aria-current="page">Capítulo {chapter.chapter}</span>
      </nav>

      {/* Reader controls */}
      <div className="reader-controls">
        <h1 className="reader-title">
          {manga.title} — Cap. {chapter.chapter}
        </h1>

        <div className="reader-mode-toggle">
          <button
            className={`btn ${mode === 'paginated' ? 'active' : ''}`}
            onClick={() => saveMode('paginated')}
          >
            <i className="fas fa-file" /> Paginado
          </button>
          <button
            className={`btn ${mode === 'continuous' ? 'active' : ''}`}
            onClick={() => saveMode('continuous')}
          >
            <i className="fas fa-scroll" /> Continuo
          </button>
        </div>
      </div>

      {/* Chapter navigation (top) */}
      <ChapterNav manga={manga} prevCap={prevCap} nextCap={nextCap} />

      {/* Images */}
      <div
        id="chapter-images"
        className={`chapter-images mode-${mode}`}
      >
        {mode === 'paginated' ? (
          <>
            <div className="page-counter">
              Página {currentPage + 1} / {pages.length}
            </div>
            <div className="paginated-page">
              <Image
                key={pages[currentPage]}
                src={pages[currentPage]}
                alt={`Página ${currentPage + 1}`}
                width={800}
                height={1200}
                style={{ maxWidth: '100%', height: 'auto' }}
                priority={currentPage === 0}
                unoptimized
              />
            </div>
            <div className="page-nav-buttons">
              <button
                className="chapter-nav-btn"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((p) => p - 1)}
                aria-label="Página anterior"
              >
                <i className="fas fa-chevron-left" />
              </button>
              <button
                className="chapter-nav-btn"
                disabled={currentPage === pages.length - 1}
                onClick={() => setCurrentPage((p) => p + 1)}
                aria-label="Página siguiente"
              >
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          </>
        ) : (
          pages.map((src, i) => (
            <Image
              key={src}
              src={src}
              alt={`Página ${i + 1}`}
              width={800}
              height={1200}
              style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
              loading={i < 3 ? 'eager' : 'lazy'}
              unoptimized
            />
          ))
        )}
      </div>

      {/* Chapter navigation (bottom) */}
      <ChapterNav manga={manga} prevCap={prevCap} nextCap={nextCap} />
    </div>
  );
}

function ChapterNav({
  manga,
  prevCap,
  nextCap,
}: {
  manga: Manga;
  prevCap: number | null;
  nextCap: number | null;
}) {
  return (
    <div className="chapter-navigation">
      {prevCap !== null ? (
        <Link href={`/chapter/${manga.id}/${prevCap}`} className="chapter-nav-btn btn">
          <i className="fas fa-chevron-left" /> Cap. {prevCap}
        </Link>
      ) : (
        <span className="chapter-nav-btn btn disabled">Primer capítulo</span>
      )}

      <Link href={`/manga/${manga.id}`} className="chapter-nav-btn btn">
        <i className="fas fa-home" /> Inicio manga
      </Link>

      {nextCap !== null ? (
        <Link href={`/chapter/${manga.id}/${nextCap}`} className="chapter-nav-btn btn">
          Cap. {nextCap} <i className="fas fa-chevron-right" />
        </Link>
      ) : (
        <span className="chapter-nav-btn btn disabled">Último capítulo</span>
      )}
    </div>
  );
}
