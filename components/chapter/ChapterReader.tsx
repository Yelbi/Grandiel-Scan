'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useHistoryContext } from '@/components/providers/HistoryProvider';
import MangaComments from '@/components/manga/MangaComments';
import type { Chapter, Manga, ReadingMode } from '@/lib/types';
import { resolvePageUrl } from '@/lib/utils';
import { CONFIG } from '@/lib/config';

/* ─── Inline SVG icons (no CDN dependency) ─── */
function IcoArrowLeft() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
function IcoFile() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
function IcoBars() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function IcoChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function IcoChevronRight() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function IcoList() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="3" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IcoCog() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IcoSun() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
function IcoArrowsH() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="8 9 5 12 8 15" />
      <polyline points="16 9 19 12 16 15" />
    </svg>
  );
}

/* ─── Main component ─── */
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
  const router = useRouter();
  const { addEntry } = useHistoryContext();
  const [mode, setMode] = useState<ReadingMode>('continuous');
  const [currentPage, setCurrentPage] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [imgWidth, setImgWidth] = useState(75);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Ref para tener siempre la página más reciente sin depender del closure
  const currentPageRef = useRef(0);

  const pages = chapter.pages.map((p) => resolvePageUrl(chapter, p));
  const sortedChapters = [...manga.chapters].sort((a, b) => a - b);
  const progressKey = `${manga.id}/${chapter.chapter}`;

  // Restaurar página guardada y registrar en historial
  useEffect(() => {
    let restoredPage = 0;
    try {
      const map = JSON.parse(
        localStorage.getItem(CONFIG.STORAGE_KEYS.PROGRESS) ?? '{}'
      ) as Record<string, number>;
      const saved = map[progressKey];
      if (Number.isInteger(saved) && saved > 0 && saved < pages.length) {
        restoredPage = saved;
        setCurrentPage(saved);
        currentPageRef.current = saved;
      }
    } catch {}

    addEntry({
      mangaId:   manga.id,
      chapter:   chapter.chapter,
      timestamp: Date.now(),
      title:     manga.title,
      page:      restoredPage,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manga.id, manga.title, chapter.chapter]); // addEntry es estable

  // Guardar página en localStorage al cambiar (ambos modos)
  useEffect(() => {
    currentPageRef.current = currentPage;
    try {
      const map = JSON.parse(
        localStorage.getItem(CONFIG.STORAGE_KEYS.PROGRESS) ?? '{}'
      ) as Record<string, number>;
      map[progressKey] = currentPage;
      localStorage.setItem(CONFIG.STORAGE_KEYS.PROGRESS, JSON.stringify(map));
    } catch {}
  }, [currentPage, progressKey]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.READING_MODE);
      if (stored === 'paginated' || stored === 'continuous') setMode(stored);
    } catch {}
  }, []);

  // Cargar ajustes de lectura guardados (brillo, anchura)
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(CONFIG.STORAGE_KEYS.READER_SETTINGS) ?? '{}'
      ) as { brightness?: number; imgWidth?: number };
      if (typeof saved.brightness === 'number' && saved.brightness >= 50 && saved.brightness <= 150)
        setBrightness(saved.brightness);
      if (typeof saved.imgWidth === 'number' && saved.imgWidth >= 30 && saved.imgWidth <= 100)
        setImgWidth(saved.imgWidth);
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

  // Detectar página actual en modo continuo por scroll
  useEffect(() => {
    if (mode !== 'continuous') return;
    const update = () => {
      const els = pageRefs.current;
      const mid = window.innerHeight / 2;
      let closest = 0;
      let closestDist = Infinity;
      els.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height / 2 - mid);
        if (dist < closestDist) { closestDist = dist; closest = i; }
      });
      if (closest !== currentPageRef.current) {
        setCurrentPage(closest);
        currentPageRef.current = closest;
      }
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, [mode, pages.length]);

  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelOpen]);

  const saveMode = useCallback((m: ReadingMode) => {
    setMode(m);
    try { localStorage.setItem(CONFIG.STORAGE_KEYS.READING_MODE, m); } catch {}
  }, []);

  const saveBrightness = useCallback((val: number) => {
    setBrightness(val);
    try {
      const cur = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.READER_SETTINGS) ?? '{}');
      localStorage.setItem(CONFIG.STORAGE_KEYS.READER_SETTINGS, JSON.stringify({ ...cur, brightness: val }));
    } catch {}
  }, []);

  const saveImgWidth = useCallback((val: number) => {
    setImgWidth(val);
    try {
      const cur = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.READER_SETTINGS) ?? '{}');
      localStorage.setItem(CONFIG.STORAGE_KEYS.READER_SETTINGS, JSON.stringify({ ...cur, imgWidth: val }));
    } catch {}
  }, []);

  const progress = pages.length > 1 ? (currentPage / (pages.length - 1)) * 100 : 100;

  const imageStyle: React.CSSProperties = {
    filter: brightness !== 100 ? `brightness(${brightness}%)` : undefined,
    maxWidth: `${imgWidth}%`,
    height: 'auto',
    margin: '0 auto',
    display: 'block',
  };

  return (
    <div className="reader-wrapper">
      {/* Sticky topbar */}
      <div className="reader-topbar">
        <Link href={`/manga/${manga.id}`} className="reader-topbar__back">
          <IcoArrowLeft />
          <span className="reader-topbar__back-label">{manga.title}</span>
        </Link>

        <span className="reader-topbar__chapter">
          Cap. {chapter.chapter}
          <span style={{ fontSize: '0.75em', opacity: 0.65, marginLeft: '0.5em' }}>
            {currentPage + 1}/{pages.length}
          </span>
        </span>

        <div className="reader-topbar__controls">
          {/* Reading mode */}
          <button
            className={`reader-mode-btn${mode === 'paginated' ? ' active' : ''}`}
            onClick={() => saveMode('paginated')}
            title="Modo paginado"
            aria-pressed={mode === 'paginated'}
            suppressHydrationWarning
          >
            <IcoFile />
          </button>
          <button
            className={`reader-mode-btn${mode === 'continuous' ? ' active' : ''}`}
            onClick={() => saveMode('continuous')}
            title="Modo continuo"
            aria-pressed={mode === 'continuous'}
            suppressHydrationWarning
          >
            <IcoBars />
          </button>

          <div className="reader-topbar__divider" />

          {/* Chapter selector */}
          <select
            className="reader-chapter-select"
            value={chapter.chapter}
            onChange={(e) => router.push(`/chapter/${manga.id}/${e.target.value}`)}
            aria-label="Ir al capítulo"
            suppressHydrationWarning
          >
            {sortedChapters.map((cap) => (
              <option key={cap} value={cap}>
                Cap. {cap}
              </option>
            ))}
          </select>

          <div className="reader-topbar__divider" />

          {/* Prev/Next chapter nav */}
          {prevCap !== null ? (
            <Link href={`/chapter/${manga.id}/${prevCap}`} className="reader-topbar__nav" title={`Cap. ${prevCap}`}>
              <IcoChevronLeft />
            </Link>
          ) : (
            <span className="reader-topbar__nav reader-topbar__nav--disabled" aria-disabled="true">
              <IcoChevronLeft />
            </span>
          )}

          {nextCap !== null ? (
            <Link href={`/chapter/${manga.id}/${nextCap}`} className="reader-topbar__nav" title={`Cap. ${nextCap}`}>
              <IcoChevronRight />
            </Link>
          ) : (
            <span className="reader-topbar__nav reader-topbar__nav--disabled" aria-disabled="true">
              <IcoChevronRight />
            </span>
          )}
        </div>
      </div>

      {/* Progress bar (ambos modos) */}
      <div
        className="reader-progress-bar"
        role="progressbar"
        aria-label="Progreso de lectura"
        aria-valuenow={currentPage + 1}
        aria-valuemax={pages.length}
      >
        <div className="reader-progress-bar__fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Content */}
      <div className="reader-content">
        {mode === 'paginated' ? (
          <>
            <div className="dede" style={{ display: 'flex', justifyContent: 'center' }}>
              <Image
                key={pages[currentPage]}
                src={pages[currentPage]}
                alt={`Página ${currentPage + 1} de ${pages.length}`}
                width={800}
                height={1200}
                style={imageStyle}
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
                <IcoChevronLeft />
              </button>
              <span className="reader-page-indicator">{currentPage + 1} / {pages.length}</span>
              <button
                className={`reader-page-btn${currentPage === pages.length - 1 ? ' reader-page-btn--disabled' : ''}`}
                disabled={currentPage === pages.length - 1}
                onClick={() => setCurrentPage((p) => p + 1)}
                aria-label="Página siguiente"
              >
                <IcoChevronRight />
              </button>
            </div>
          </>
        ) : (
          <div className="dede">
            {pages.map((src, i) => (
              <div
                key={src}
                ref={(el) => { pageRefs.current[i] = el; }}
                style={{ display: 'flex', justifyContent: 'center' }}
              >
                <Image
                  src={src}
                  alt={`Página ${i + 1}`}
                  width={800}
                  height={1200}
                  style={imageStyle}
                  loading={i < 3 ? 'eager' : 'lazy'}
                  unoptimized
                />
              </div>
            ))}
          </div>
        )}

        {/* Bottom chapter navigation */}
        <div className="reader-chapter-nav">
          {prevCap !== null ? (
            <Link href={`/chapter/${manga.id}/${prevCap}`} className="reader-chapter-btn">
              <IcoChevronLeft /> Cap. {prevCap}
            </Link>
          ) : (
            <span className="reader-chapter-btn reader-chapter-btn--disabled">Primer capítulo</span>
          )}

          <Link href={`/manga/${manga.id}`} className="reader-chapter-btn reader-chapter-btn--home">
            <IcoList /> Ver capítulos
          </Link>

          {nextCap !== null ? (
            <Link href={`/chapter/${manga.id}/${nextCap}`} className="reader-chapter-btn reader-chapter-btn--next">
              Cap. {nextCap} <IcoChevronRight />
            </Link>
          ) : (
            <span className="reader-chapter-btn reader-chapter-btn--disabled">Último capítulo</span>
          )}
        </div>

        {/* Comments for this chapter */}
        <MangaComments mangaId={manga.id} chapterNum={chapter.chapter} />
      </div>

      {/* Floating settings panel */}
      <div className="reader-controls" ref={panelRef}>
        <button
          className="reader-controls-toggle"
          onClick={() => setPanelOpen((o) => !o)}
          aria-label="Ajustes de lectura"
          aria-expanded={panelOpen}
        >
          <IcoCog />
        </button>

        <div className={`reader-controls-panel${panelOpen ? ' active' : ''}`}>
          <p className="reader-controls-title">Ajustes de lectura</p>

          {/* Brightness */}
          <div className="reader-control-group">
            <div className="reader-control-label">
              <IcoSun />
              Brillo: {brightness}%
            </div>
            <div className="reader-control-row">
              <input
                type="range"
                className="reader-slider"
                min={50}
                max={150}
                value={brightness}
                onChange={(e) => saveBrightness(Number(e.target.value))}
                aria-label="Brillo de las páginas"
              />
            </div>
          </div>

          {/* Width */}
          <div className="reader-control-group">
            <div className="reader-control-label">
              <IcoArrowsH />
              Anchura: {imgWidth}%
            </div>
            <div className="reader-control-row">
              <input
                type="range"
                className="reader-slider"
                min={30}
                max={100}
                value={imgWidth}
                onChange={(e) => saveImgWidth(Number(e.target.value))}
                aria-label="Anchura de las páginas"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
