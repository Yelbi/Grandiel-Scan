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

  useEffect(() => {
    addEntry({
      mangaId: manga.id,
      chapter: chapter.chapter,
      timestamp: Date.now(),
      title: manga.title,
    });
  }, [manga.id, manga.title, chapter.chapter, addEntry]);

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

  const progress = pages.length > 1 ? (currentPage / (pages.length - 1)) * 100 : 100;

  return (
    <div className="reader-wrapper">
      {/* Sticky topbar */}
      <div className="reader-topbar">
        <Link href={`/manga/${manga.id}`} className="reader-topbar__back">
          <i className="fas fa-arrow-left" aria-hidden="true" />
          <span className="reader-topbar__back-label">{manga.title}</span>
        </Link>

        <span className="reader-topbar__chapter">Cap. {chapter.chapter}</span>

        <div className="reader-topbar__controls">
          <button
            className={`reader-mode-btn${mode === 'paginated' ? ' active' : ''}`}
            onClick={() => saveMode('paginated')}
            title="Modo paginado"
            aria-pressed={mode === 'paginated'}
          >
            <i className="fas fa-file" aria-hidden="true" />
          </button>
          <button
            className={`reader-mode-btn${mode === 'continuous' ? ' active' : ''}`}
            onClick={() => saveMode('continuous')}
            title="Modo continuo"
            aria-pressed={mode === 'continuous'}
          >
            <i className="fas fa-scroll" aria-hidden="true" />
          </button>

          <div className="reader-topbar__divider" aria-hidden="true" />

          {prevCap !== null ? (
            <Link
              href={`/chapter/${manga.id}/${prevCap}`}
              className="reader-topbar__nav"
              title={`Cap. ${prevCap}`}
            >
              <i className="fas fa-chevron-left" aria-hidden="true" />
            </Link>
          ) : (
            <span className="reader-topbar__nav reader-topbar__nav--disabled" aria-disabled="true">
              <i className="fas fa-chevron-left" aria-hidden="true" />
            </span>
          )}

          {nextCap !== null ? (
            <Link
              href={`/chapter/${manga.id}/${nextCap}`}
              className="reader-topbar__nav"
              title={`Cap. ${nextCap}`}
            >
              <i className="fas fa-chevron-right" aria-hidden="true" />
            </Link>
          ) : (
            <span className="reader-topbar__nav reader-topbar__nav--disabled" aria-disabled="true">
              <i className="fas fa-chevron-right" aria-hidden="true" />
            </span>
          )}
        </div>
      </div>

      {/* Progress bar (paginated only) */}
      {mode === 'paginated' && (
        <div
          className="reader-progress-bar"
          role="progressbar"
          aria-label="Progreso de lectura"
          aria-valuenow={currentPage + 1}
          aria-valuemax={pages.length}
        >
          <div className="reader-progress-bar__fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Content */}
      <div className="reader-content">
        {mode === 'paginated' ? (
          <>
            <div className="dede">
              <Image
                key={pages[currentPage]}
                src={pages[currentPage]}
                alt={`Página ${currentPage + 1} de ${pages.length}`}
                width={800}
                height={1200}
                style={{ maxWidth: '100%', height: 'auto' }}
                priority={currentPage === 0}
                unoptimized
              />
            </div>

            <div className="reader-page-nav">
              <button
                className={`reader-page-btn${currentPage === 0 ? ' reader-page-btn--disabled' : ''}`}
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((p) => p - 1)}
                aria-label="Página anterior"
              >
                <i className="fas fa-chevron-left" aria-hidden="true" />
              </button>
              <span className="reader-page-indicator">{currentPage + 1} / {pages.length}</span>
              <button
                className={`reader-page-btn${currentPage === pages.length - 1 ? ' reader-page-btn--disabled' : ''}`}
                disabled={currentPage === pages.length - 1}
                onClick={() => setCurrentPage((p) => p + 1)}
                aria-label="Página siguiente"
              >
                <i className="fas fa-chevron-right" aria-hidden="true" />
              </button>
            </div>
          </>
        ) : (
          <div className="dede">
            {pages.map((src, i) => (
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
            ))}
          </div>
        )}

        {/* Bottom chapter navigation */}
        <div className="reader-chapter-nav">
          {prevCap !== null ? (
            <Link href={`/chapter/${manga.id}/${prevCap}`} className="reader-chapter-btn">
              <i className="fas fa-chevron-left" aria-hidden="true" /> Cap. {prevCap}
            </Link>
          ) : (
            <span className="reader-chapter-btn reader-chapter-btn--disabled">Primer capítulo</span>
          )}

          <Link href={`/manga/${manga.id}`} className="reader-chapter-btn reader-chapter-btn--home">
            <i className="fas fa-list" aria-hidden="true" /> Ver capítulos
          </Link>

          {nextCap !== null ? (
            <Link href={`/chapter/${manga.id}/${nextCap}`} className="reader-chapter-btn reader-chapter-btn--next">
              Cap. {nextCap} <i className="fas fa-chevron-right" aria-hidden="true" />
            </Link>
          ) : (
            <span className="reader-chapter-btn reader-chapter-btn--disabled">Último capítulo</span>
          )}
        </div>
      </div>
    </div>
  );
}
