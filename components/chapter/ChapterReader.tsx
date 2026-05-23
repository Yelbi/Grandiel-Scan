'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useHistoryContext } from '@/components/providers/HistoryProvider';
import MangaComments from '@/components/manga/MangaComments';
import ReportChapterButton from '@/components/chapter/ReportChapterButton';
import type { Chapter, Manga, ReadingMode } from '@/lib/types';
import { resolvePageUrl, toProxyUrl } from '@/lib/utils';
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
function IcoFullscreen() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}
function IcoFullscreenExit() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="10" y1="14" x2="3" y2="21" />
      <line x1="21" y1="3" x2="14" y2="10" />
    </svg>
  );
}

/* ─── Page image with skeleton loader and error fallback ─── */
function PageImage({
  src,
  alt,
  maxWidth,
  priority,
  loading,
}: {
  src: string;
  alt: string;
  maxWidth: number;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  const wrapperStyle: React.CSSProperties = { maxWidth: `${maxWidth}%`, margin: '0 auto' };

  if (error) {
    return (
      <div className="reader-page-error" style={wrapperStyle}>
        <i className="fas fa-exclamation-circle" aria-hidden="true" />
        <span>No se pudo cargar la página</span>
        <button className="reader-page-error__retry" onClick={() => { setError(false); }}>
          <i className="fas fa-redo" aria-hidden="true" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="reader-page-wrapper" style={wrapperStyle}>
      {!loaded && <div className="reader-page-skeleton" aria-hidden="true" />}
      <Image
        src={src}
        alt={alt}
        width={800}
        height={1200}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
        priority={priority}
        loading={loading}
        unoptimized
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
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

  const [mode, setMode]               = useState<ReadingMode>('continuous');
  const [currentPage, setCurrentPage] = useState(0);
  const [brightness, setBrightness]   = useState(100);
  const [imgWidth, setImgWidth]       = useState(75);
  const [panelOpen, setPanelOpen]     = useState(false);
  const [uiVisible, setUiVisible]     = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pageAnnouncement, setPageAnnouncement] = useState('');

  const panelRef          = useRef<HTMLDivElement>(null);
  const pageRefs          = useRef<(HTMLDivElement | null)[]>([]);
  const currentPageRef    = useRef(0);
  const touchStartX       = useRef(0);
  const touchStartY       = useRef(0);
  const pendingScrollPage = useRef<number | null>(null);

  const pages = useMemo(
    () => chapter.pages.map((p) => toProxyUrl(resolvePageUrl(chapter, p))),
    [chapter],
  );

  const sortedChapters = useMemo(
    () => [...manga.chapters].sort((a, b) => a - b),
    [manga.chapters],
  );

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
      mangaId:    manga.id,
      chapter:    chapter.chapter,
      timestamp:  Date.now(),
      title:      manga.title,
      image:      manga.image,
      page:       restoredPage,
      totalPages: pages.length,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manga.id, manga.title, chapter.chapter]);

  // Guardar página en localStorage al cambiar
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

  // A-7: anunciar cambio de página en modo paginado
  useEffect(() => {
    if (mode !== 'paginated') return;
    setPageAnnouncement(`Página ${currentPage + 1} de ${pages.length}`);
  }, [currentPage, mode, pages.length]);

  // Restaurar modo de lectura
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.READING_MODE);
      if (stored === 'paginated' || stored === 'continuous') setMode(stored);
    } catch {}
  }, []);

  // Restaurar ajustes (brillo, anchura)
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(CONFIG.STORAGE_KEYS.READER_SETTINGS) ?? '{}'
      ) as { brightness?: number; imgWidth?: number };
      if (typeof saved.brightness === 'number' && saved.brightness >= 50 && saved.brightness <= 150)
        setBrightness(saved.brightness);
      if (typeof saved.imgWidth === 'number' && saved.imgWidth >= 30 && saved.imgWidth <= 100)
        setImgWidth(saved.imgWidth);
      else if (window.matchMedia('(max-width: 768px)').matches)
        setImgWidth(100);
    } catch {}
  }, []);

  // Navegación por teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (mode === 'paginated') {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          setCurrentPage((p) => Math.min(p + 1, pages.length - 1));
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          setCurrentPage((p) => Math.max(p - 1, 0));
        }
      } else {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          const next = currentPageRef.current + 1;
          if (next < pages.length)
            pageRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const prev = currentPageRef.current - 1;
          if (prev >= 0)
            pageRefs.current[prev]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode, pages.length]);

  // F-3: Escape cierra el panel de ajustes
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanelOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [panelOpen]);

  // IntersectionObserver para detectar página visible en modo continuo
  useEffect(() => {
    if (mode !== 'continuous') return;

    const ratios = new Map<number, number>();
    const observers: IntersectionObserver[] = [];

    pageRefs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          ratios.set(i, entry.intersectionRatio);
          let best = 0, bestRatio = -1;
          ratios.forEach((r, idx) => { if (r > bestRatio) { bestRatio = r; best = idx; } });
          if (best !== currentPageRef.current) {
            setCurrentPage(best);
            currentPageRef.current = best;
          }
        },
        { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0] },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, [mode, pages.length]);

  // Al cambiar a modo continuo, hacer scroll a la página actual
  useEffect(() => {
    if (mode !== 'continuous' || pendingScrollPage.current === null) return;
    const targetPage = pendingScrollPage.current;
    pendingScrollPage.current = null;
    requestAnimationFrame(() => {
      pageRefs.current[targetPage]?.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
  }, [mode]);

  // Precargar páginas adyacentes en modo paginado para navegación instantánea
  useEffect(() => {
    if (mode !== 'paginated') return;
    [currentPage + 1, currentPage + 2, currentPage - 1]
      .filter((i) => i >= 0 && i < pages.length)
      .forEach((i) => {
        const img = new window.Image();
        img.src = pages[i];
      });
  }, [currentPage, mode, pages]);

  // F-2: pointerdown (no mousedown) para cerrar panel al click fuera
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        setPanelOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [panelOpen]);

  // Sincronizar estado con cambios de pantalla completa
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const saveMode = useCallback((m: ReadingMode) => {
    if (m === 'continuous') pendingScrollPage.current = currentPageRef.current;
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

  const toggleUi = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('a, button, input, select')) return;
    setUiVisible((v) => {
      if (v) setPanelOpen(false);
      return !v;
    });
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {}
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    const swipeThreshold = window.innerWidth * 0.1;
    if (Math.abs(dx) > swipeThreshold && dy < 80) {
      if (dx < 0) setCurrentPage((p) => Math.min(p + 1, pages.length - 1));
      else        setCurrentPage((p) => Math.max(p - 1, 0));
    }
  }, [pages.length]);

  const progress = pages.length > 1 ? (currentPage / (pages.length - 1)) * 100 : 100;

  if (pages.length === 0) {
    return (
      <div className="reader-wrapper">
        <div className="reader-empty">
          <i className="fas fa-file-slash" aria-hidden="true" />
          <p>Este capítulo no tiene páginas disponibles.</p>
          <Link href={`/manga/${manga.id}`} className="btn">Volver al manga</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`reader-wrapper${uiVisible ? ' reader-ui-visible' : ''}`}>
      {/* A-7: Live region para anunciar cambio de página */}
      <span className="visually-hidden" aria-live="polite" aria-atomic="true">
        {pageAnnouncement}
      </span>

      {/* Sticky topbar */}
      <div className="reader-topbar">
        <Link href={`/manga/${manga.id}`} className="reader-topbar__back">
          <IcoArrowLeft />
          <span className="reader-topbar__back-label">{manga.title}</span>
        </Link>

        <span className="reader-topbar__chapter">
          Cap. {chapter.chapter}
          <span className="reader-topbar__page-indicator">
            {currentPage + 1}/{pages.length}
          </span>
        </span>

        <div className="reader-topbar__controls">
          {/* Reading mode */}
          <button
            className={`reader-mode-btn${mode === 'paginated' ? ' active' : ''}`}
            onClick={() => saveMode('paginated')}
            title="Modo paginado"
            aria-label="Modo paginado"
            aria-pressed={mode === 'paginated'}
            suppressHydrationWarning
          >
            <IcoFile />
          </button>
          <button
            className={`reader-mode-btn${mode === 'continuous' ? ' active' : ''}`}
            onClick={() => saveMode('continuous')}
            title="Modo continuo"
            aria-label="Modo continuo"
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
              <option key={cap} value={cap}>Cap. {cap}</option>
            ))}
          </select>

          <div className="reader-topbar__divider" />

          {/* Prev/Next chapter — A-5: usar button disabled en lugar de span */}
          {prevCap !== null ? (
            <Link
              href={`/chapter/${manga.id}/${prevCap}`}
              className="reader-topbar__nav"
              title={`Cap. ${prevCap}`}
              aria-label={`Capítulo anterior: ${prevCap}`}
            >
              <IcoChevronLeft />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="reader-topbar__nav reader-topbar__nav--disabled"
              aria-label="No hay capítulo anterior"
            >
              <IcoChevronLeft />
            </button>
          )}

          {nextCap !== null ? (
            <Link
              href={`/chapter/${manga.id}/${nextCap}`}
              className="reader-topbar__nav"
              title={`Cap. ${nextCap}`}
              aria-label={`Capítulo siguiente: ${nextCap}`}
            >
              <IcoChevronRight />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="reader-topbar__nav reader-topbar__nav--disabled"
              aria-label="No hay capítulo siguiente"
            >
              <IcoChevronRight />
            </button>
          )}

          <div className="reader-topbar__divider" />

          <ReportChapterButton
            mangaId={manga.id}
            chapter={chapter.chapter}
            mangaTitle={manga.title}
          />
        </div>
      </div>

      {/* A-4: Progress bar con aria-valuemin y aria-valuetext */}
      <div
        className="reader-progress-bar"
        role="progressbar"
        aria-label="Progreso de lectura"
        aria-valuemin={1}
        aria-valuenow={currentPage + 1}
        aria-valuemax={pages.length}
        aria-valuetext={`Página ${currentPage + 1} de ${pages.length}`}
      >
        <div className="reader-progress-bar__fill" style={{ width: `${progress}%` }} />
      </div>

      {/* F-1: brightness via CSS variable — sólo afecta imágenes, no botones ni texto */}
      <div
        className="reader-content"
        style={{ '--reader-brightness': `${brightness}%` } as React.CSSProperties}
        onClick={toggleUi}
      >
        {mode === 'paginated' ? (
          <>
            <div
              className="reader-page-container"
              style={{ display: 'flex', justifyContent: 'center' }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <PageImage
                key={pages[currentPage]}
                src={pages[currentPage]}
                alt={`Página ${currentPage + 1} de ${pages.length}`}
                maxWidth={imgWidth}
                priority
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
          <div className="reader-page-container">
            {pages.map((src, i) => (
              <div
                key={src}
                ref={(el) => { pageRefs.current[i] = el; }}
                style={{ display: 'flex', justifyContent: 'center' }}
              >
                {/* A-6: alt incluye total en modo continuo */}
                <PageImage
                  src={src}
                  alt={`Página ${i + 1} de ${pages.length}`}
                  maxWidth={imgWidth}
                  priority={i === 0}
                  loading={i === 0 ? undefined : i < 3 ? 'eager' : 'lazy'}
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

        <MangaComments mangaId={manga.id} chapterNum={chapter.chapter} />
      </div>

      {/* Floating settings panel — A-3: aria-controls + id */}
      <div className="reader-controls" ref={panelRef}>
        <button
          className={`reader-controls-toggle${panelOpen ? ' is-open' : ''}`}
          onClick={() => setPanelOpen((o) => !o)}
          aria-label="Ajustes de lectura"
          aria-expanded={panelOpen}
          aria-controls="reader-settings-panel"
        >
          <IcoCog />
        </button>

        <div
          id="reader-settings-panel"
          className={`reader-controls-panel${panelOpen ? ' active' : ''}`}
        >
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

          {/* Pantalla completa */}
          <div className="reader-control-group">
            <button
              className="reader-fullscreen-btn"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <IcoFullscreenExit /> : <IcoFullscreen />}
              {isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
