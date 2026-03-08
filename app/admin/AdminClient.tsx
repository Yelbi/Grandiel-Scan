'use client';

import { useState } from 'react';
import type { Manga } from '@/lib/types';

/* ─── helpers ──────────────────────────────────────── */
function titleToId(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function generatePages(count: number, ext: string): string[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const pad = n < 10 ? `0${n}` : `${n}`;
    return `${pad}.${ext}`;
  });
}

function parseManualPages(raw: string): string[] {
  return raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
}

function parseNonNegativeNum(raw: string): number | null {
  const num = Number(raw);
  if (!isFinite(num) || num < 0) return null;
  return num;
}

function buildViewerUrl(template: string, folderId: string, chapter: number): string {
  return template
    .replace(/\{folderId\}/g, folderId)
    .replace(/\{chapter\}/g, String(chapter));
}

const GENRES = [
  'Acción', 'Apocalíptico', 'Artes Marciales', 'Aventura', 'Bender',
  'Ciencia Ficción', 'Comedia', 'Demonios', 'Deporte', 'Drama',
  'Familia', 'Fantasía', 'Gore', 'Harem', 'Harem Inverso',
  'Histórico', 'Horror', 'Isekai', 'Josei', 'Magia',
  'Mecha', 'Militar', 'Misterio', 'Psicológico', 'Realidad Virtual',
  'Recuentos de la vida', 'Reencarnación', 'Regresion', 'Romance', 'Seinen',
  'Shonen', 'Shoujo', 'Sistema', 'Supernatural', 'Supervivencia',
  'Tragedia', 'Transmigración', 'Vida Escolar',
];

function GenrePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (genre: string) =>
    onChange(value.includes(genre) ? value.filter((g) => g !== genre) : [...value, genre]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {GENRES.map((g) => {
          const active = value.includes(g);
          return (
            <button
              key={g}
              type="button"
              onClick={() => toggle(g)}
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: '.78rem',
                cursor: 'pointer',
                border: active ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.15)',
                background: active ? 'rgba(255,50,50,0.18)' : 'rgba(255,255,255,0.04)',
                color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontWeight: active ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {g}
            </button>
          );
        })}
      </div>
      {value.length > 0 && (
        <span className="form-hint">{value.length} género{value.length !== 1 ? 's' : ''} seleccionado{value.length !== 1 ? 's' : ''}</span>
      )}
    </div>
  );
}

type HtmlChapterEntry = {
  chapter: number;
  folderId: string;
  viewerUrl?: string;
};

type Tab   = 'manga' | 'chapter' | 'edit-manga' | 'edit-chapter' | 'bulk' | 'autodiscover' | 'delete';
type Alert = { type: 'ok' | 'err'; msg: string } | null;

type BulkStatus = 'pending' | 'probing' | 'saving' | 'done' | 'error' | 'skip';
type BulkEntry  = { chapter: number; folderId: string; status: BulkStatus; pages: number; pattern: string; error?: string };

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'manga',        label: 'Añadir Manga',     icon: 'fas fa-book'           },
  { id: 'chapter',      label: 'Añadir Capítulo',  icon: 'fas fa-plus-circle'    },
  { id: 'bulk',         label: 'Carga Masiva',      icon: 'fas fa-layer-group'    },
  { id: 'autodiscover', label: 'Auto-Descubrir',    icon: 'fas fa-bolt'           },
  { id: 'edit-manga',   label: 'Editar Manga',      icon: 'fas fa-pen'            },
  { id: 'edit-chapter', label: 'Editar Capítulo',   icon: 'fas fa-edit'           },
  { id: 'delete',       label: 'Eliminar',          icon: 'fas fa-trash-alt'      },
];

/* Parsea:
   • "28: 65076"
   • "28 65076"
   • "28,65076"
   • "28:65076:https://.../capitulo/65076/comic-xxx"
   • "28:65076:/capitulo/65076/comic-xxx"                                  */
function parseBulkList(raw: string): Array<{ chapter: number; folderId: string; viewerUrl?: string }> {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const m = line.match(/^(\d+(?:[.,]\d+)?)\s*[:\-,\s]\s*(\S+)(.*)$/);
      if (!m) return [];

      const chapter = Number(m[1]);
      const folderId = m[2].replace(/[:|,]+$/, '');

      let viewerUrl: string | undefined;
      const tail = m[3]?.trim() ?? '';
      if (tail) {
        const cleaned = tail.replace(/^[:|,\s-]+/, '').trim();
        if (/^https?:\/\//i.test(cleaned) || cleaned.startsWith('/')) {
          viewerUrl = cleaned;
        }
      }

      return [{ chapter, folderId, ...(viewerUrl ? { viewerUrl } : {}) }];
    });
}

/* Extrae entradas capítulo/folder (y opcionalmente URL lectora) del HTML.
   Soporta cuatro formatos:
   1. /capitulo/{folderId}/comic-{slug}  → folderId es el ID real del CDN
   2. /manga/{mangaId}/capitulo/{num}    → (kumanga.com) usa el nro de capítulo como placeholder
   3. /capitulo/{folderId}/             → (ikigaimangas / Qwik) folderId es un Snowflake ID;
                                          nro de capítulo viene del atributo alt de la imagen
   4. /capitulo/{folderId}/{word-slug}  → (nakamanga / NuevoVisor) slug de texto; nro de
                                          capítulo viene del texto "Capítulo N" dentro del <a>  */
function parseHtmlChapterEntries(html: string): HtmlChapterEntry[] {
  const entries: HtmlChapterEntry[] = [];
  const seen = new Set<string>();

  function toViewerUrl(href: string): string | undefined {
    const normalized = href.trim();
    if (!normalized) return undefined;
    if (/^https?:\/\//i.test(normalized)) return normalized;
    if (normalized.startsWith('/')) return normalized;
    return undefined;
  }

  function pushEntry(entry: HtmlChapterEntry) {
    const key = `${entry.chapter}:${entry.folderId}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push(entry);
  }

  function chapterFromChunk(chunk: string): number | null {
    const match = /Cap[ií]tulo(?:&nbsp;|\s)+(\d+(?:[.,]\d+)?)/i.exec(chunk);
    if (!match) return null;
    const raw = match[1].replace(',', '.');
    const chapter = Number(raw);
    return isFinite(chapter) && chapter >= 0 ? chapter : null;
  }

  // Formato 1: /capitulo/{folderId}/comic-{slug}
  const re1 = /<a[^>]+href="([^"]*\/capitulo\/(\d+)\/comic-[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re1.exec(html)) !== null) {
    const viewerUrl = toViewerUrl(match[1]);
    const folderId  = match[2];
    const chapter   = chapterFromChunk(match[3]);
    if (chapter !== null) pushEntry({ chapter, folderId, viewerUrl });
  }
  if (entries.length > 0) return entries;

  // Formato 4: /capitulo/{folderId}/{word-slug}  (nakamanga / NuevoVisor)
  // El slug es texto (ej. "novela-el-hijo-menor-..."), no "comic-XXX" y no termina en /.
  // El nro de capítulo viene del texto "Capítulo N" dentro del <a>.
  const re4 = /<a[^>]+href="([^"]*\/capitulo\/(\d+)\/[^"\/][^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = re4.exec(html)) !== null) {
    const viewerUrl = toViewerUrl(match[1]);
    const folderId  = match[2];
    const chapter   = chapterFromChunk(match[3]);
    if (chapter !== null) pushEntry({ chapter, folderId, viewerUrl });
  }
  if (entries.length > 0) return entries;

  // Formato 3: /capitulo/{folderId}/  (ikigaimangas – Qwik framework)
  // El folderId es un Snowflake ID grande; el nro de capítulo se extrae del
  // atributo alt de la imagen (alt="Capítulo 12") o del texto del h3 sin comentarios HTML.
  const re3 = /<a[^>]+href="([^"]*\/capitulo\/(\d+)\/)"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = re3.exec(html)) !== null) {
    const viewerUrl = toViewerUrl(match[1]);
    const folderId  = match[2];
    const innerHtml = match[3];
    // Intentar extraer del atributo alt primero
    let chapMatch = /alt="Cap[ií]tulo\s+(\d+(?:[.,]\d+)?)"/i.exec(innerHtml);
    if (!chapMatch) {
      // Fallback: quitar comentarios HTML y buscar "Capítulo N"
      const stripped = innerHtml.replace(/<!--[\s\S]*?-->/g, '');
      chapMatch = /Cap[ií]tulo\s+(\d+(?:[.,]\d+)?)/i.exec(stripped);
    }
    if (chapMatch) {
      const raw = chapMatch[1].replace(',', '.');
      const chapter = Number(raw);
      if (isFinite(chapter) && chapter >= 0) {
        pushEntry({ chapter, folderId, viewerUrl });
      }
    }
  }
  if (entries.length > 0) return entries;

  // Formato 2: /manga/{mangaId}/capitulo/{chapterNum}  (kumanga.com)
  // El HTML no incluye el folder ID del CDN; se usa el nro de capítulo como placeholder.
  const re2 = /<a[^>]+href="([^"]*\/manga\/\d+\/capitulo\/(\d+))"[^>]*>/gi;
  while ((match = re2.exec(html)) !== null) {
    const viewerUrl = toViewerUrl(match[1]);
    const chapter   = Number(match[2]);
    if (Number.isInteger(chapter) && chapter >= 0) {
      pushEntry({ chapter, folderId: String(chapter), viewerUrl });
    }
  }
  return entries;
}

function parseHtmlChapters(html: string): string {
  return parseHtmlChapterEntries(html)
    .map((e) => `${e.chapter}: ${e.folderId}`)
    .join('\n');
}

/* ─── component ────────────────────────────────────── */
export default function AdminClient({ initialMangas }: { initialMangas: Manga[] }) {
  const [tab, setTab]       = useState<Tab>('manga');
  const [mangas, setMangas] = useState<Manga[]>(initialMangas);
  const [alert, setAlert]   = useState<Alert>(null);
  const [loading, setLoading] = useState(false);

  /* ── Add Manga state ── */
  const [mTitle,  setMTitle]  = useState('');
  const [mImage,  setMImage]  = useState('');
  const [mDesc,   setMDesc]   = useState('');
  const [mGenres, setMGenres] = useState<string[]>([]);
  const [mType,   setMType]   = useState<Manga['type']>('Manhwa');
  const [mStatus, setMStatus] = useState<Manga['status']>('En Emision');
  const [mDate,   setMDate]   = useState(new Date().toISOString().split('T')[0]);

  /* ── Add Chapter state ── */
  const [cMangaId,    setCMangaId]    = useState('');
  const [cNum,        setCNum]        = useState('');
  const [cBaseUrl,    setCBaseUrl]    = useState('');
  const [cMode,       setCMode]       = useState<'auto' | 'manual'>('auto');
  const [cCount,      setCCount]      = useState('');
  const [cExt,        setCExt]        = useState('webp');
  const [cManual,     setCManual]     = useState('');
  const [cSlugHint,   setCSlugHint]   = useState('');
  const [cViewerUrl,  setCViewerUrl]  = useState('');
  const [probing,     setProbing]     = useState(false);
  const [probeResult, setProbeResult] = useState<{ pattern: string; count: number } | null>(null);

  /* ── Bulk state ── */
  const [bMangaId,        setBMangaId]        = useState('');
  const [bComicBase,      setBComicBase]      = useState('');
  const [bExt,            setBExt]            = useState('webp');
  const [bViewerTemplate, setBViewerTemplate] = useState('');
  const [bViewerByFolder, setBViewerByFolder] = useState<Record<string, string>>({});
  const [bList,           setBList]           = useState('');
  const [bRunning,        setBRunning]        = useState(false);
  const [bProgress,       setBProgress]       = useState<BulkEntry[]>([]);
  const [bHtmlRaw,        setBHtmlRaw]        = useState('');
  const [bHtmlOpen,       setBHtmlOpen]       = useState(false);

  /* ── Delete state ── */
  const [dMangaId,   setDMangaId]   = useState('');
  const [dChMangaId, setDChMangaId] = useState('');
  const [dChNum,     setDChNum]     = useState('');

  /* ── Edit Manga state ── */
  const [emId,     setEmId]     = useState('');
  const [emTitle,  setEmTitle]  = useState('');
  const [emImage,  setEmImage]  = useState('');
  const [emDesc,   setEmDesc]   = useState('');
  const [emGenres, setEmGenres] = useState<string[]>([]);
  const [emType,   setEmType]   = useState<Manga['type']>('Manhwa');
  const [emStatus, setEmStatus] = useState<Manga['status']>('En Emision');
  const [emDate,   setEmDate]   = useState('');

  /* ── Edit Chapter state ── */
  const [ecMangaId,    setEcMangaId]    = useState('');
  const [ecChapterNum, setEcChapterNum] = useState('');
  const [ecBaseUrl,    setEcBaseUrl]    = useState('');
  const [ecManual,     setEcManual]     = useState('');
  const [ecLoading,    setEcLoading]    = useState(false);
  const [ecProbing,    setEcProbing]    = useState(false);
  const [ecProbeResult,setEcProbeResult]= useState<{ pattern: string; count: number } | null>(null);

  /* ── Auto-Discover state ── */
  const [adMangaId,   setAdMangaId]   = useState('');
  const [adBase,      setAdBase]      = useState('');
  const [adExt,       setAdExt]       = useState('webp');
  const [adStart,     setAdStart]     = useState('');
  const [adEnd,       setAdEnd]       = useState('');
  const [adStartChap, setAdStartChap] = useState('');
  const [adSlugHint,  setAdSlugHint]  = useState('');
  const [adScanning,     setAdScanning]     = useState(false);
  const [adScanProgress, setAdScanProgress] = useState<{ scanned: number; total: number; pattern: string; patternIdx: number; patternCount: number } | null>(null);
  const [adRunning,      setAdRunning]      = useState(false);
  const [adFound,     setAdFound]     = useState<{ folderId: number; chapter: number }[]>([]);
  const [adTotal,     setAdTotal]     = useState(0);
  const [adProgress,  setAdProgress]  = useState<BulkEntry[]>([]);
  const [adAdjustIdx, setAdAdjustIdx] = useState<number | null>(null);
  const [adAdjustVal, setAdAdjustVal] = useState('');

  /* ─── helpers ─────────────────────────────── */
  function notify(type: 'ok' | 'err', msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 5000);
  }

  /* ─── BULK: carga masiva ──────────────────── */
  async function runBulk() {
    const entries = parseBulkList(bList);
    if (!entries.length || !bMangaId || !bComicBase.trim()) {
      notify('err', 'Completa el manga, URL base y la lista de capítulos.');
      return;
    }
    const comicBase = bComicBase.replace(/\/$/, '');
    setBRunning(true);
    setBProgress(entries.map((e) => ({ ...e, status: 'pending', pages: 0, pattern: '' })));
    let okCount = 0;

    for (let i = 0; i < entries.length; i++) {
      const { chapter, folderId, viewerUrl: viewerFromList } = entries[i];
      const baseUrl = `${comicBase}/${folderId}/`;
      const viewerUrl = viewerFromList
        ?? bViewerByFolder[folderId]
        ?? (bViewerTemplate.trim() ? buildViewerUrl(bViewerTemplate.trim(), folderId, chapter) : undefined);

      // → probing
      setBProgress((prev) => prev.map((e, idx) => idx === i ? { ...e, status: 'probing' } : e));

      let probeJson: { pages?: string[]; pattern?: string; count?: number; error?: string };
      try {
        const res = await fetch('/api/admin/probe-chapter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseUrl,
            ext: bExt,
            chapterHint: chapter,
            viewerUrl,
          }),
        });
        probeJson = await res.json();
        if (!res.ok || !probeJson.pages?.length) {
          setBProgress((prev) => prev.map((e, idx) => idx === i
            ? { ...e, status: 'error', error: probeJson.error ?? 'Sin páginas detectadas' } : e));
          continue;
        }
      } catch {
        setBProgress((prev) => prev.map((e, idx) => idx === i
          ? { ...e, status: 'error', error: 'Error de red' } : e));
        continue;
      }

      // → saving
      setBProgress((prev) => prev.map((e, idx) => idx === i
        ? { ...e, status: 'saving', pages: probeJson.count ?? 0, pattern: probeJson.pattern ?? '' } : e));

      try {
        const res = await fetch('/api/admin/chapter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mangaId: bMangaId, chapter, baseUrl, pages: probeJson.pages }),
        });
        const saveJson = await res.json();
        if (!res.ok) {
          setBProgress((prev) => prev.map((e, idx) => idx === i
            ? { ...e, status: saveJson.error?.includes('ya existe') ? 'skip' : 'error', error: saveJson.error } : e));
        } else {
          okCount++;
          setBProgress((prev) => prev.map((e, idx) => idx === i ? { ...e, status: 'done' } : e));
          setMangas((prev) => prev.map((m) =>
            m.id === bMangaId
              ? { ...m, chapters: [...new Set([...m.chapters, chapter])].sort((a, b) => a - b), latestChapter: Math.max(m.latestChapter, chapter) }
              : m,
          ));
        }
      } catch {
        setBProgress((prev) => prev.map((e, idx) => idx === i
          ? { ...e, status: 'error', error: 'Error de red al guardar' } : e));
      }
    }

    setBRunning(false);
    const done  = entries.length;
    notify('ok', `Carga masiva terminada: ${okCount}/${done} capítulos subidos.`);
  }

  /* ─── AUTO-DISCOVER: escanear rango de folders (SSE) ─ */
  async function scanFolders() {
    if (!adBase.trim() || !adStart || !adEnd) {
      notify('err', 'Completa la URL base y el rango de folders.');
      return;
    }
    setAdScanning(true);
    setAdFound([]);
    setAdTotal(0);
    setAdProgress([]);
    setAdScanProgress(null);
    try {
      const res = await fetch('/api/admin/scan-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comicBase:   adBase.trim(),
          folderStart: Number(adStart),
          folderEnd:   Number(adEnd),
          ext:         adExt || 'webp',
          slugHint:    adSlugHint.trim() || undefined,
        }),
      });
      if (!res.ok || res.headers.get('content-type')?.includes('application/json')) {
        const json = await res.json();
        notify('err', json.error ?? 'Error al escanear.');
        return;
      }
      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer    = '';
      const startChap = parseNonNegativeNum(adStartChap) ?? 1;
      let hitCount  = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'hit') {
              const chapter = startChap + hitCount++;
              setAdFound((prev) => [...prev, { folderId: event.folderId as number, chapter }]);
            } else if (event.type === 'progress') {
              setAdScanProgress({ scanned: event.scanned as number, total: event.total as number, pattern: event.pattern as string, patternIdx: event.patternIdx as number, patternCount: event.patternCount as number });
            } else if (event.type === 'done') {
              setAdTotal(event.total as number);
              if (hitCount === 0) notify('err', 'No se encontraron folders con páginas en ese rango.');
            } else if (event.type === 'error') {
              notify('err', String(event.message ?? 'Error al escanear.'));
            }
          } catch { /* línea malformada, ignorar */ }
        }
      }
    } catch {
      notify('err', 'Error de red al escanear.');
    } finally {
      setAdScanning(false);
      setAdScanProgress(null);
    }
  }

  /* ─── AUTO-DISCOVER: subir capítulos encontrados ─ */
  async function runAutoDiscover() {
    if (!adFound.length || !adMangaId) {
      notify('err', 'Selecciona un manga y escanea primero.');
      return;
    }
    const comicBase = adBase.replace(/\/$/, '');
    setAdRunning(true);
    setAdProgress(adFound.map((e) => ({
      chapter: e.chapter,
      folderId: String(e.folderId),
      status: 'pending',
      pages: 0,
      pattern: '',
    })));

    let doneCount = 0;
    for (let i = 0; i < adFound.length; i++) {
      const { chapter, folderId } = adFound[i];
      const baseUrl = `${comicBase}/${folderId}/`;

      setAdProgress((prev) => prev.map((e, idx) => idx === i ? { ...e, status: 'probing' } : e));

      let probeJson: { pages?: string[]; pattern?: string; count?: number; error?: string };
      try {
        const res = await fetch('/api/admin/probe-chapter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseUrl, ext: adExt || 'webp', chapterHint: chapter, slugHint: adSlugHint.trim() || undefined }),
        });
        probeJson = await res.json();
        if (!res.ok || !probeJson.pages?.length) {
          setAdProgress((prev) => prev.map((e, idx) => idx === i
            ? { ...e, status: 'error', error: probeJson.error ?? 'Sin páginas detectadas' } : e));
          continue;
        }
      } catch {
        setAdProgress((prev) => prev.map((e, idx) => idx === i
          ? { ...e, status: 'error', error: 'Error de red' } : e));
        continue;
      }

      setAdProgress((prev) => prev.map((e, idx) => idx === i
        ? { ...e, status: 'saving', pages: probeJson.count ?? 0, pattern: probeJson.pattern ?? '' } : e));

      try {
        const res = await fetch('/api/admin/chapter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mangaId: adMangaId, chapter, baseUrl, pages: probeJson.pages }),
        });
        const saveJson = await res.json();
        if (!res.ok) {
          setAdProgress((prev) => prev.map((e, idx) => idx === i
            ? { ...e, status: saveJson.error?.includes('ya existe') ? 'skip' : 'error', error: saveJson.error } : e));
        } else {
          doneCount++;
          setAdProgress((prev) => prev.map((e, idx) => idx === i ? { ...e, status: 'done' } : e));
          setMangas((prev) => prev.map((m) =>
            m.id === adMangaId
              ? { ...m, chapters: [...new Set([...m.chapters, chapter])].sort((a, b) => a - b), latestChapter: Math.max(m.latestChapter, chapter) }
              : m,
          ));
        }
      } catch {
        setAdProgress((prev) => prev.map((e, idx) => idx === i
          ? { ...e, status: 'error', error: 'Error de red al guardar' } : e));
      }
    }

    setAdRunning(false);
    notify('ok', `Auto-descubrir terminado: ${doneCount}/${adFound.length} capítulos subidos.`);
  }

  /* ─── probe (add chapter) ─────────────────── */
  async function probePages() {
    if (!cBaseUrl.trim()) { notify('err', 'Ingresa la Base URL primero.'); return; }
    setProbing(true); setProbeResult(null);
    try {
      const chapterHint = parseNonNegativeNum(cNum);
      const res  = await fetch('/api/admin/probe-chapter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: cBaseUrl.trim(), ext: cExt.trim() || 'webp', chapterHint: chapterHint ?? undefined, slugHint: cSlugHint.trim() || undefined, viewerUrl: cViewerUrl.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { notify('err', json.error ?? 'No se detectaron páginas.'); }
      else {
        setCMode('manual');
        setCManual((json.pages as string[]).join('\n'));
        setProbeResult({ pattern: json.pattern, count: json.count });
        notify('ok', `✓ Detectadas ${json.count} páginas (patrón: ${json.pattern})`);
      }
    } catch { notify('err', 'Error de red al probar la URL.'); }
    finally { setProbing(false); }
  }

  /* ─── probe (edit chapter) ────────────────── */
  async function ecProbePages() {
    if (!ecBaseUrl.trim()) { notify('err', 'Ingresa la Base URL primero.'); return; }
    setEcProbing(true); setEcProbeResult(null);
    try {
      const chapterHint = parseNonNegativeNum(ecChapterNum);
      const res  = await fetch('/api/admin/probe-chapter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: ecBaseUrl.trim(), ext: 'webp', chapterHint: chapterHint ?? undefined }),
      });
      const json = await res.json();
      if (!res.ok) { notify('err', json.error ?? 'No se detectaron páginas.'); }
      else {
        setEcManual((json.pages as string[]).join('\n'));
        setEcProbeResult({ pattern: json.pattern, count: json.count });
        notify('ok', `✓ Detectadas ${json.count} páginas (patrón: ${json.pattern})`);
      }
    } catch { notify('err', 'Error de red al probar la URL.'); }
    finally { setEcProbing(false); }
  }

  /* ─── load manga into edit form ───────────── */
  function loadMangaForEdit(id: string) {
    setEmId(id);
    const m = mangas.find((x) => x.id === id);
    if (!m) return;
    setEmTitle(m.title);
    setEmImage(m.image);
    setEmDesc(m.description ?? '');
    setEmGenres(m.genres ?? []);
    setEmType(m.type);
    setEmStatus(m.status);
    setEmDate(m.dateAdded ?? '');
  }

  /* ─── load chapter into edit form ─────────── */
  async function loadChapterForEdit(mangaId: string, chapterNum: string) {
    if (!mangaId || !chapterNum) return;
    setEcLoading(true);
    setEcBaseUrl(''); setEcManual(''); setEcProbeResult(null);
    try {
      const res  = await fetch(`/api/admin/chapter?mangaId=${mangaId}&chapter=${chapterNum}`);
      const json = await res.json();
      if (!res.ok) { notify('err', json.error ?? 'Error cargando capítulo.'); }
      else {
        setEcBaseUrl(json.baseUrl ?? '');
        setEcManual((json.pages as string[]).join('\n'));
      }
    } catch { notify('err', 'Error de red.'); }
    finally { setEcLoading(false); }
  }

  /* ─── SUBMIT: add manga ───────────────────── */
  async function submitManga(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const id    = titleToId(mTitle);
    const today = new Date().toISOString().split('T')[0];
    const manga: Manga = {
      id, title: mTitle.trim(), slug: id,
      image: mImage.trim(), description: mDesc.trim(),
      genres: mGenres,
      type: mType, status: mStatus, chapters: [],
      dateAdded: mDate || today, lastUpdated: mDate || today, latestChapter: 0,
    };
    const res  = await fetch('/api/admin/manga', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(manga) });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { notify('err', json.error ?? 'Error desconocido'); }
    else {
      notify('ok', `✓ Manga "${manga.title}" añadido (id: ${manga.id})`);
      setMangas((prev) => [...prev, manga]);
      setMTitle(''); setMImage(''); setMDesc(''); setMGenres([]);
      setMType('Manhwa'); setMStatus('En Emision');
      setMDate(new Date().toISOString().split('T')[0]);
    }
  }

  /* ─── SUBMIT: add chapter ─────────────────── */
  async function submitChapter(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const chapterNum = parseNonNegativeNum(cNum);
    if (chapterNum === null) {
      notify('err', 'El número de capítulo debe ser un número válido mayor o igual a 0.');
      setLoading(false);
      return;
    }
    const pages = cMode === 'auto'
      ? generatePages(Number(cCount), cExt.trim() || 'webp')
      : parseManualPages(cManual);
    if (!pages.length) { notify('err', 'La lista de páginas está vacía.'); setLoading(false); return; }
    const chapter = { mangaId: cMangaId, chapter: chapterNum, ...(cBaseUrl.trim() ? { baseUrl: cBaseUrl.trim() } : {}), pages };
    const res  = await fetch('/api/admin/chapter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(chapter) });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { notify('err', json.error ?? 'Error desconocido'); }
    else {
      const title = mangas.find((m) => m.id === cMangaId)?.title ?? cMangaId;
      notify('ok', `✓ Capítulo ${chapterNum} de "${title}" añadido (${pages.length} páginas)`);
      setCNum(''); setCBaseUrl(''); setCCount(''); setCManual(''); setCSlugHint('');
      setProbeResult(null); setCMode('auto');
      // sync local manga chapters list
      setMangas((prev) => prev.map((m) =>
        m.id === cMangaId
          ? { ...m, chapters: [...new Set([...m.chapters, chapterNum])].sort((a,b)=>a-b), latestChapter: Math.max(m.latestChapter, chapterNum) }
          : m,
      ));
    }
  }

  /* ─── SUBMIT: edit manga ──────────────────── */
  async function submitEditManga(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const payload = {
      id: emId, title: emTitle.trim(), slug: emTitle.trim().toLowerCase(),
      image: emImage.trim(), description: emDesc.trim(),
      genres: emGenres,
      type: emType, status: emStatus, dateAdded: emDate,
    };
    const res  = await fetch('/api/admin/manga', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { notify('err', json.error ?? 'Error desconocido'); }
    else {
      notify('ok', `✓ Manga "${emTitle}" actualizado.`);
      setMangas((prev) => prev.map((m) => m.id === emId ? { ...m, ...json.manga } : m));
    }
  }

  /* ─── DELETE manga ────────────────────────── */
  async function deleteManga() {
    if (!window.confirm(`¿Eliminar "${emTitle}" y todos sus capítulos? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    const res  = await fetch('/api/admin/manga', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: emId }) });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { notify('err', json.error ?? 'Error desconocido'); }
    else {
      notify('ok', `✓ Manga eliminado (${json.removedChapters} capítulos borrados).`);
      setMangas((prev) => prev.filter((m) => m.id !== emId));
      setEmId(''); setEmTitle(''); setEmImage(''); setEmDesc(''); setEmGenres([]);
    }
  }

  /* ─── SUBMIT: edit chapter ────────────────── */
  async function submitEditChapter(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const chapterNum = parseNonNegativeNum(ecChapterNum);
    if (chapterNum === null) {
      notify('err', 'El número de capítulo debe ser un número válido mayor o igual a 0.');
      setLoading(false);
      return;
    }
    const pages = parseManualPages(ecManual);
    if (!pages.length) { notify('err', 'La lista de páginas está vacía.'); setLoading(false); return; }
    const payload = {
      mangaId: ecMangaId, chapter: chapterNum, pages,
      baseUrl: ecBaseUrl.trim() || undefined,
    };
    const res  = await fetch('/api/admin/chapter', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { notify('err', json.error ?? 'Error desconocido'); }
    else {
      const title = mangas.find((m) => m.id === ecMangaId)?.title ?? ecMangaId;
      notify('ok', `✓ Capítulo ${chapterNum} de "${title}" actualizado (${pages.length} páginas).`);
    }
  }

  /* ─── DELETE chapter ──────────────────────── */
  async function deleteChapter() {
    if (!window.confirm(`¿Eliminar capítulo ${ecChapterNum}? Esta acción no se puede deshacer.`)) return;
    const chapterNum = parseNonNegativeNum(ecChapterNum);
    if (chapterNum === null) {
      notify('err', 'Capítulo inválido.');
      return;
    }
    setLoading(true);
    const res  = await fetch('/api/admin/chapter', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mangaId: ecMangaId, chapter: chapterNum }) });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { notify('err', json.error ?? 'Error desconocido'); }
    else {
      const title = mangas.find((m) => m.id === ecMangaId)?.title ?? ecMangaId;
      notify('ok', `✓ Capítulo ${chapterNum} de "${title}" eliminado.`);
      setMangas((prev) => prev.map((m) =>
        m.id === ecMangaId
          ? { ...m, chapters: m.chapters.filter((n) => n !== chapterNum) }
          : m,
      ));
      setEcChapterNum(''); setEcBaseUrl(''); setEcManual(''); setEcProbeResult(null);
    }
  }

  /* ─── DELETE: manga desde tab Eliminar ───────── */
  async function doDeleteManga() {
    const m = mangas.find((x) => x.id === dMangaId);
    if (!m) return;
    if (!window.confirm(`¿Eliminar "${m.title}" y TODOS sus capítulos? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    const res  = await fetch('/api/admin/manga', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: dMangaId }) });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { notify('err', json.error ?? 'Error'); }
    else {
      notify('ok', `✓ Manga "${m.title}" eliminado (${json.removedChapters} capítulos borrados).`);
      setMangas((prev) => prev.filter((x) => x.id !== dMangaId));
      setDMangaId('');
    }
  }

  /* ─── DELETE: capítulo desde tab Eliminar ──────── */
  async function doDeleteChapter() {
    const m = mangas.find((x) => x.id === dChMangaId);
    if (!m || !dChNum) return;
    if (!window.confirm(`¿Eliminar capítulo ${dChNum} de "${m.title}"?`)) return;
    setLoading(true);
    const res  = await fetch('/api/admin/chapter', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mangaId: dChMangaId, chapter: parseNonNegativeNum(dChNum) }) });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { notify('err', json.error ?? 'Error'); }
    else {
      notify('ok', `✓ Capítulo ${dChNum} de "${m.title}" eliminado.`);
      setMangas((prev) => prev.map((x) =>
        x.id === dChMangaId ? { ...x, chapters: x.chapters.filter((n) => n !== Number(dChNum)) } : x,
      ));
      setDChNum('');
    }
  }

  /* ─── UI shared styles ─────────────────────── */
  const probeBtn = (onClick: () => void, disabled: boolean, busy: boolean) => (
    <button type="button" className="btn-primary" onClick={onClick}
      disabled={disabled} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
      {busy ? <><i className="fas fa-spinner fa-spin" /> Probando…</> : <><i className="fas fa-search" /> Detectar</>}
    </button>
  );

  const deleteBtn = (onClick: () => void, label: string) => (
    <button type="button" onClick={onClick} disabled={loading}
      style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid rgba(255,0,0,.4)', background: 'rgba(255,0,0,.08)', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '.875rem' }}>
      <i className="fas fa-trash-alt" /> {label}
    </button>
  );

  /* ─── render ──────────────────────────────── */
  return (
    <div className="curva" style={{ maxWidth: 760, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem' }}>
        <h1 style={{ color: 'var(--color-text)', textAlign: 'left', fontSize: '1.8rem', margin: '0 0 .4rem' }}>
          <i className="fas fa-tools" /> Panel de Administración
        </h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '.875rem' }}>
          Los cambios se guardan directamente en la base de datos (Supabase).
        </p>
      </div>

      {/* Alert */}
      {alert && (
        <div style={{
          padding: '12px 16px', marginBottom: '1.5rem', borderRadius: 8,
          background: alert.type === 'ok' ? 'rgba(0,200,100,.12)' : 'rgba(255,0,0,.12)',
          border: `1px solid ${alert.type === 'ok' ? 'rgba(0,200,100,.35)' : 'rgba(255,0,0,.35)'}`,
          color: alert.type === 'ok' ? '#00c864' : 'var(--color-primary)', fontSize: '.875rem',
        }}>
          {alert.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="novedades-tabs" style={{ marginBottom: '2rem', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t.id} className={`novedades-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            <i className={t.icon} /> {t.label}
          </button>
        ))}
      </div>

      {/* ══ ADD MANGA ══ */}
      {tab === 'manga' && (
        <form className="user-form" onSubmit={submitManga}>
          <div className="form-group">
            <label>Título *</label>
            <input value={mTitle} onChange={(e) => setMTitle(e.target.value)} required placeholder="Ej: Solo Leveling" />
            {mTitle && <span className="form-hint">ID generado: <strong>{titleToId(mTitle)}</strong></span>}
          </div>
          <div className="form-group">
            <label>URL de portada *</label>
            <input value={mImage} onChange={(e) => setMImage(e.target.value)} required placeholder="https://... o /img/nombre.webp" />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea value={mDesc} onChange={(e) => setMDesc(e.target.value)} rows={4} placeholder="Sinopsis del manga..." />
          </div>
          <div className="form-group">
            <label>Géneros</label>
            <GenrePicker value={mGenres} onChange={setMGenres} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Tipo</label>
              <select value={mType} onChange={(e) => setMType(e.target.value as Manga['type'])}>
                <option>Manhwa</option><option>Manga</option><option>Manhua</option>
              </select>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select value={mStatus} onChange={(e) => setMStatus(e.target.value as Manga['status'])}>
                <option>En Emision</option><option>Finalizado</option><option>Pausado</option>
              </select>
            </div>
            <div className="form-group">
              <label>Fecha de añadido</label>
              <input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} />
            </div>
          </div>
          <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando…' : <><i className="fas fa-save" /> Guardar Manga</>}
            </button>
          </div>
        </form>
      )}

      {/* ══ ADD CHAPTER ══ */}
      {tab === 'chapter' && (
        <form className="user-form" onSubmit={submitChapter}>
          <div className="form-group">
            <label>Manga *</label>
            <select value={cMangaId} onChange={(e) => setCMangaId(e.target.value)} required>
              <option value="">— Selecciona un manga —</option>
              {[...mangas].sort((a, b) => a.title.localeCompare(b.title)).map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Número de capítulo *</label>
              <input type="number" min={0} step="any" value={cNum} onChange={(e) => setCNum(e.target.value)} required placeholder="1" />
            </div>
            <div className="form-group">
              <label>Base URL</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={cBaseUrl} onChange={(e) => { setCBaseUrl(e.target.value); setProbeResult(null); }}
                  placeholder="https://dashboard.olympusbiblioteca.com/storage/comics/743/58809/" style={{ flex: 1 }} />
                {probeBtn(probePages, probing || !cBaseUrl.trim(), probing)}
              </div>
              <span className="form-hint">
                {probeResult
                  ? <span style={{ color: '#00c864' }}><i className="fas fa-check-circle" /> {probeResult.count} páginas · patrón <strong>{probeResult.pattern}</strong></span>
                  : 'Haz clic en Detectar para auto-rellenar las páginas.'}
              </span>
            </div>
          </div>
          <div className="form-group">
            <label>Slug de páginas <span style={{ fontWeight: 'normal', color: 'var(--color-text-muted)' }}>(opcional)</span></label>
            <input
              value={cSlugHint}
              onChange={(e) => { setCSlugHint(e.target.value); setProbeResult(null); }}
              placeholder="c-463-ingeniero"
            />
            <span className="form-hint">
              Solo necesario si las páginas usan un nombre textual en vez de números (ej: <code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 4px', borderRadius: 3 }}>c-463-ingeniero_01.webp</code>)
            </span>
          </div>
          <div className="form-group">
            <label>URL del visor <span style={{ fontWeight: 'normal', color: 'var(--color-text-muted)' }}>(opcional — para CDNs con hash)</span></label>
            <input
              value={cViewerUrl}
              onChange={(e) => { setCViewerUrl(e.target.value); setProbeResult(null); }}
              placeholder="https://olympusbiblioteca.com/capitulo/40429/comic-titulo"
            />
            <span className="form-hint">
              Si las páginas tienen nombres con hash impredecible (ej: <code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 4px', borderRadius: 3 }}>1 - bb006670.webp</code>), pega aquí la URL de la página del capítulo en el sitio de lectura y el detector extraerá las imágenes de ahí.
            </span>
          </div>
          <div className="form-group">
            <label>Páginas *</label>
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
              {(['auto', 'manual'] as const).map((m) => (
                <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 'normal' }}>
                  <input type="radio" checked={cMode === m} onChange={() => setCMode(m)} />
                  {m === 'auto' ? 'Auto (01.webp, 02.webp…)' : 'Manual (lista personalizada)'}
                </label>
              ))}
            </div>
            {cMode === 'auto' && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <input type="number" min={1} value={cCount} onChange={(e) => setCCount(e.target.value)}
                    required={cMode === 'auto'} placeholder="Cantidad de páginas (ej: 80)" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <input value={cExt} onChange={(e) => setCExt(e.target.value)} placeholder="Extensión (webp)" />
                  <span className="form-hint">Extensión del archivo</span>
                </div>
              </div>
            )}
            {cMode === 'manual' && (
              <textarea value={cManual} onChange={(e) => setCManual(e.target.value)}
                required={cMode === 'manual'} rows={6} placeholder={'01.webp\n02.webp\n1_01.webp\n1_02.webp'} />
            )}
            {cMode === 'auto' && cCount && (
              <span className="form-hint">
                Se generarán: {generatePages(Number(cCount), cExt || 'webp').slice(0, 5).join(', ')}
                {Number(cCount) > 5 ? ` … (${cCount} páginas)` : ''}
              </span>
            )}
            {cMode === 'manual' && cManual && (
              <span className="form-hint">{parseManualPages(cManual).length} páginas detectadas</span>
            )}
          </div>
          <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando…' : <><i className="fas fa-plus" /> Añadir Capítulo</>}
            </button>
          </div>
        </form>
      )}

      {/* ══ BULK UPLOAD ══ */}
      {tab === 'bulk' && (
        <div>
          {/* Config */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label>Manga *</label>
              <select value={bMangaId} onChange={(e) => setBMangaId(e.target.value)} disabled={bRunning}>
                <option value="">— Selecciona un manga —</option>
                {[...mangas].sort((a, b) => a.title.localeCompare(b.title)).map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Extensión</label>
              <input value={bExt} onChange={(e) => setBExt(e.target.value)} placeholder="webp" disabled={bRunning} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>URL base del cómic *</label>
            <input
              value={bComicBase}
              onChange={(e) => setBComicBase(e.target.value)}
              placeholder="https://dashboard.olympusbiblioteca.com/storage/comics/743"
              disabled={bRunning}
            />
            <span className="form-hint">
              El sistema construye: <code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>URL base / carpeta /</code> para cada capítulo
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Plantilla URL del lector <span style={{ fontWeight: 'normal', color: 'var(--color-text-muted)' }}>(opcional — para archivos con hash aleatorio)</span></label>
            <input
              value={bViewerTemplate}
              onChange={(e) => setBViewerTemplate(e.target.value)}
              placeholder="https://olympusbiblioteca.com/leer/manga/52/{folderId}"
              disabled={bRunning}
            />
            <span className="form-hint">
              Debe ser la URL de la <strong>página lectora</strong> del manga (no la URL del CDN/storage).
              Usa <code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>{'{folderId}'}</code> para el folder ID y/o <code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>{'{chapter}'}</code> para el número de capítulo.
              El sistema raspa ese HTML buscando imágenes como <code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>1 - bb006670.webp</code>.
            </span>
          </div>

          {/* ── Importar desde HTML ── */}
          <div style={{ marginBottom: '1.5rem', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setBHtmlOpen((v) => !v)}
              disabled={bRunning}
              style={{ width: '100%', padding: '10px 14px', background: 'var(--color-bg-tertiary)', border: 'none', color: 'var(--color-text-secondary)', fontSize: '.85rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <i className={`fas fa-code`} />
              Importar lista desde HTML
              <i className={`fas fa-chevron-${bHtmlOpen ? 'up' : 'down'}`} style={{ marginLeft: 'auto' }} />
            </button>
            {bHtmlOpen && (
              <div style={{ padding: '12px 14px', background: 'var(--color-bg-secondary)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--color-text-muted)' }}>
                  Pega el HTML de la página de capítulos. Soporta dos formatos:{' '}
                  <code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>/capitulo/<strong>101650</strong>/comic-…</code>
                  {' '}(folder ID real) y{' '}
                  <code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>/manga/10719/capitulo/<strong>1</strong></code>
                  {' '}(kumanga.com — usa nro de capítulo como placeholder; reemplaza el segundo número con el folder ID real del CDN si es diferente).
                </p>
                <textarea
                  value={bHtmlRaw}
                  onChange={(e) => setBHtmlRaw(e.target.value)}
                  rows={6}
                  placeholder='Pega aquí el HTML con los <a href="/capitulo/…"> o <a href="/manga/.../capitulo/…"> …'
                  style={{ fontFamily: 'monospace', fontSize: '.75rem', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!bHtmlRaw.trim()}
                    onClick={() => {
                      const entries = parseHtmlChapterEntries(bHtmlRaw);
                      if (!entries.length) { notify('err', 'No se encontraron capítulos en el HTML.'); return; }
                      const result = entries
                        .map((e) => e.viewerUrl
                          ? `${e.chapter}: ${e.folderId}: ${e.viewerUrl}`
                          : `${e.chapter}: ${e.folderId}`)
                        .join('\n');
                      setBList((prev) => prev.trim() ? prev.trim() + '\n' + result : result);
                      setBViewerByFolder((prev) => {
                        const next = { ...prev };
                        entries.forEach((e) => {
                          if (e.viewerUrl) next[e.folderId] = e.viewerUrl;
                        });
                        return next;
                      });
                      setBHtmlRaw('');
                      setBHtmlOpen(false);
                      const withViewer = entries.filter((e) => !!e.viewerUrl).length;
                      notify('ok', `✓ ${entries.length} capítulos importados desde el HTML${withViewer > 0 ? ` (${withViewer} con URL lectora)` : ''}.`);
                    }}
                  >
                    <i className="fas fa-file-import" /> Extraer y añadir a la lista
                  </button>
                  {bHtmlRaw.trim() && (
                    <span style={{ fontSize: '.8rem', color: 'var(--color-text-muted)' }}>
                      {(() => {
                        const entries = parseHtmlChapterEntries(bHtmlRaw);
                        if (!entries.length) return 'Sin resultados';
                        const withViewer = entries.filter((e) => !!e.viewerUrl).length;
                        return `${entries.length} capítulos detectados${withViewer > 0 ? ` · ${withViewer} con URL lectora` : ''}`;
                      })()}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Lista de capítulos * <span style={{ fontWeight: 'normal', color: 'var(--color-text-muted)' }}>(formato: capítulo: carpeta[: viewerUrl])</span></label>
            <textarea
              value={bList}
              onChange={(e) => setBList(e.target.value)}
              disabled={bRunning}
              rows={10}
              placeholder={'28: 65076\n29: 66022: /capitulo/66022/comic-titulo\n30: 66571: https://olympusbiblioteca.com/capitulo/66571/comic-titulo'}
              style={{ fontFamily: 'monospace', fontSize: '.85rem' }}
            />
            {bList && !bRunning && (
              <span className="form-hint">{parseBulkList(bList).length} capítulos en la lista</span>
            )}
          </div>

          {/* Action */}
          {!bRunning && bProgress.length === 0 && (
            <button
              type="button"
              className="btn-primary"
              onClick={runBulk}
              disabled={!bMangaId || !bComicBase.trim() || !bList.trim()}
            >
              <i className="fas fa-layer-group" /> Detectar y Subir Todos
            </button>
          )}
          {bRunning && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '.875rem', marginBottom: '1rem' }}>
              <i className="fas fa-spinner fa-spin" /> Procesando capítulos… no cierres esta página.
            </p>
          )}
          {bProgress.length > 0 && !bRunning && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => { setBProgress([]); setBList(''); setBViewerByFolder({}); }}
              style={{ marginBottom: '1rem' }}
            >
              <i className="fas fa-redo" /> Nueva carga
            </button>
          )}

          {/* Progress list */}
          {bProgress.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: '1rem' }}>
              {/* Summary bar */}
              {!bRunning && (() => {
                const done  = bProgress.filter((e) => e.status === 'done').length;
                const skip  = bProgress.filter((e) => e.status === 'skip').length;
                const err   = bProgress.filter((e) => e.status === 'error').length;
                return (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-bg-tertiary)', fontSize: '.8rem', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                    <strong style={{ color: '#00c864' }}>{done} subidos</strong>
                    {skip > 0 && <> · <strong style={{ color: '#f0a500' }}>{skip} ya existían</strong></>}
                    {err  > 0 && <> · <strong style={{ color: 'var(--color-primary)' }}>{err} errores</strong></>}
                    {' '}de {bProgress.length} capítulos
                  </div>
                );
              })()}

              {bProgress.map((e) => {
                const icon =
                  e.status === 'pending'  ? '⏳' :
                  e.status === 'probing'  ? '🔍' :
                  e.status === 'saving'   ? '💾' :
                  e.status === 'done'     ? '✅' :
                  e.status === 'skip'     ? '⏭️' : '❌';
                const color =
                  e.status === 'done'  ? '#00c864' :
                  e.status === 'error' ? 'var(--color-primary)' :
                  e.status === 'skip'  ? '#f0a500' :
                  'var(--color-text-muted)';
                return (
                  <div key={e.chapter} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '.8rem', padding: '6px 10px', borderRadius: 6, background: 'var(--color-bg-tertiary)' }}>
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
                    <span style={{ color: 'var(--color-text-secondary)', flexShrink: 0, minWidth: 80 }}>Cap. {e.chapter}</span>
                    <code style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>{e.folderId}</code>
                    <span style={{ color, marginLeft: 'auto', textAlign: 'right' }}>
                      {e.status === 'done'    && `${e.pages} páginas · ${e.pattern}`}
                      {e.status === 'saving'  && `Guardando ${e.pages} páginas…`}
                      {e.status === 'probing' && 'Detectando páginas…'}
                      {e.status === 'pending' && 'En cola'}
                      {e.status === 'skip'    && 'Ya existía'}
                      {e.status === 'error'   && (e.error ?? 'Error')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ AUTO-DISCOVER ══ */}
      {tab === 'autodiscover' && (
        <div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '.875rem', marginBottom: '1.5rem' }}>
            Escanea un rango de folders para descubrir automáticamente qué carpetas tienen páginas.
            El sistema prueba los patrones más comunes (<code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>01_01</code>, <code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>1_01</code>, <code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>01</code>…) sin que tengas que buscar los IDs manualmente.
          </p>

          {/* Config */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label>Manga *</label>
              <select value={adMangaId} onChange={(e) => setAdMangaId(e.target.value)} disabled={adRunning}>
                <option value="">— Selecciona un manga —</option>
                {[...mangas].sort((a, b) => a.title.localeCompare(b.title)).map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Extensión</label>
              <input value={adExt} onChange={(e) => setAdExt(e.target.value)} placeholder="webp" disabled={adRunning} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label>URL base del cómic *</label>
              <input
                value={adBase}
                onChange={(e) => { setAdBase(e.target.value); setAdFound([]); setAdProgress([]); }}
                placeholder="https://dashboard.olympusbiblioteca.com/storage/comics/463"
                disabled={adRunning}
              />
              <span className="form-hint">Solo el ID del cómic, sin la carpeta del capítulo.</span>
            </div>
            <div className="form-group">
              <label>Slug de páginas <span style={{ fontWeight: 'normal', color: 'var(--color-text-muted)' }}>(opcional)</span></label>
              <input
                value={adSlugHint}
                onChange={(e) => { setAdSlugHint(e.target.value); setAdFound([]); setAdProgress([]); }}
                placeholder="c-463-ingeniero"
                disabled={adRunning}
              />
              <span className="form-hint">Nombre base si las páginas usan texto en vez de número</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label>Folder ID desde *</label>
              <input
                type="number" min={1} value={adStart}
                onChange={(e) => { setAdStart(e.target.value); setAdFound([]); setAdProgress([]); }}
                placeholder="39000" disabled={adRunning}
              />
            </div>
            <div className="form-group">
              <label>Folder ID hasta *</label>
              <input
                type="number" min={1} value={adEnd}
                onChange={(e) => { setAdEnd(e.target.value); setAdFound([]); setAdProgress([]); }}
                placeholder="42000" disabled={adRunning}
              />
              <span className="form-hint">Máximo 100,000 folders</span>
            </div>
            <div className="form-group">
              <label>Capítulo inicial</label>
              <input
                type="number" min={1} step={1} value={adStartChap}
                onChange={(e) => setAdStartChap(e.target.value)}
                placeholder="1" disabled={adRunning}
              />
              <span className="form-hint">Se asignan en orden</span>
            </div>
          </div>

          {/* Scan button */}
          {!adRunning && (
            <button
              type="button"
              className="btn-primary"
              onClick={scanFolders}
              disabled={adScanning || !adBase.trim() || !adStart || !adEnd}
              style={{ marginBottom: adScanning ? '0.75rem' : '1.5rem' }}
            >
              {adScanning
                ? <><i className="fas fa-spinner fa-spin" /> Escaneando…</>
                : <><i className="fas fa-bolt" /> Escanear Folders</>}
            </button>
          )}

          {/* Scan progress bar */}
          {adScanning && adScanProgress && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>
                <span><strong style={{ color: '#00c864' }}>{adFound.length}</strong> encontrados</span>
                <span style={{ fontFamily: 'monospace' }}>{adScanProgress.pattern}.{adExt || 'webp'} [{adScanProgress.patternIdx + 1}/{adScanProgress.patternCount}]</span>
              </div>
              <div style={{ fontSize: '.7rem', color: 'var(--color-text-muted)', textAlign: 'right', marginBottom: 4 }}>
                {adScanProgress.scanned.toLocaleString()} / {adScanProgress.total.toLocaleString()} folders
              </div>
              <div style={{ height: 6, borderRadius: 4, background: 'var(--color-bg-tertiary)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  borderRadius: 4,
                  background: 'var(--color-primary)',
                  width: `${Math.round(((adScanProgress.patternIdx * adScanProgress.total + adScanProgress.scanned) / (adScanProgress.patternCount * adScanProgress.total)) * 100)}%`,
                  transition: 'width 0.2s ease',
                }} />
              </div>
            </div>
          )}

          {/* Scan result summary */}
          {!adScanning && adTotal > 0 && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-bg-tertiary)', fontSize: '.8rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              Escaneados <strong>{adTotal}</strong> folders ·{' '}
              {adFound.length > 0
                ? <strong style={{ color: '#00c864' }}>{adFound.length} encontrados</strong>
                : <strong style={{ color: 'var(--color-primary)' }}>0 encontrados</strong>}
            </div>
          )}

          {/* Found folders list */}
          {adFound.length > 0 && !adRunning && adProgress.length === 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                Folders encontrados — edita los números (solo enteros), o usa <strong>↓ Ajustar</strong> para corregir el offset desde una fila:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
                {adFound.map((e, idx) => (
                  <div key={e.folderId} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.8rem', padding: '5px 10px', borderRadius: 6, background: 'var(--color-bg-tertiary)' }}>
                      <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>Cap.</span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={e.chapter}
                        onChange={(ev) => {
                          const chapterNum = parseNonNegativeNum(ev.target.value);
                          if (chapterNum === null) return;
                          setAdAdjustIdx(null);
                          setAdFound((prev) => prev.map((x, i) => i === idx ? { ...x, chapter: chapterNum } : x));
                        }}
                        style={{ width: 70, padding: '2px 6px', borderRadius: 4, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: '.8rem' }}
                      />
                      <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                      <code style={{ color: 'var(--color-text-secondary)', flex: 1 }}>folder {e.folderId}</code>
                      {idx < adFound.length - 1 && (
                        <button
                          type="button"
                          title="Corregir numeración desde esta fila hacia abajo"
                          onClick={() => {
                            if (adAdjustIdx === idx) { setAdAdjustIdx(null); setAdAdjustVal(''); }
                            else { setAdAdjustIdx(idx); setAdAdjustVal(String(e.chapter)); }
                          }}
                          style={{
                            padding: '2px 8px', borderRadius: 4, fontSize: '.75rem', cursor: 'pointer', flexShrink: 0,
                            border: `1px solid ${adAdjustIdx === idx ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            background: adAdjustIdx === idx ? 'rgba(255,0,0,.1)' : 'transparent',
                            color: adAdjustIdx === idx ? 'var(--color-primary)' : 'var(--color-text-muted)',
                          }}
                        >
                          ↓ Ajustar
                        </button>
                      )}
                    </div>

                    {/* Inline adjust panel */}
                    {adAdjustIdx === idx && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, background: 'rgba(255,0,0,.06)', border: '1px solid rgba(255,0,0,.2)', fontSize: '.8rem', marginLeft: 8 }}>
                        <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>Desde aquí, capítulo correcto:</span>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={adAdjustVal}
                          onChange={(ev) => setAdAdjustVal(ev.target.value)}
                          style={{ width: 70, padding: '2px 6px', borderRadius: 4, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: '.8rem' }}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newStart = parseNonNegativeNum(adAdjustVal);
                            if (newStart === null) return;
                            setAdFound((prev) => prev.map((x, i) => {
                              if (i < idx) return x;
                              return { ...x, chapter: newStart + (i - idx) };
                            }));
                            setAdAdjustIdx(null);
                            setAdAdjustVal('');
                          }}
                          style={{ padding: '3px 10px', borderRadius: 4, background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '.8rem' }}
                        >
                          Aplicar
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAdAdjustIdx(null); setAdAdjustVal(''); }}
                          style={{ padding: '3px 8px', borderRadius: 4, background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', cursor: 'pointer', fontSize: '.8rem' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
                <button type="button" className="btn-primary" onClick={runAutoDiscover}>
                  <i className="fas fa-layer-group" /> Subir todos ({adFound.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setAdFound([]); setAdTotal(0); setAdAdjustIdx(null); setAdAdjustVal(''); }}
                  style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '.875rem' }}
                >
                  <i className="fas fa-redo" /> Re-escanear
                </button>
              </div>
            </div>
          )}

          {/* Upload progress */}
          {adRunning && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '.875rem', marginBottom: '1rem' }}>
              <i className="fas fa-spinner fa-spin" /> Subiendo capítulos… no cierres esta página.
            </p>
          )}

          {adProgress.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: '1rem' }}>
              {!adRunning && (() => {
                const done = adProgress.filter((e) => e.status === 'done').length;
                const skip = adProgress.filter((e) => e.status === 'skip').length;
                const err  = adProgress.filter((e) => e.status === 'error').length;
                return (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-bg-tertiary)', fontSize: '.8rem', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                    <strong style={{ color: '#00c864' }}>{done} subidos</strong>
                    {skip > 0 && <> · <strong style={{ color: '#f0a500' }}>{skip} ya existían</strong></>}
                    {err  > 0 && <> · <strong style={{ color: 'var(--color-primary)' }}>{err} errores</strong></>}
                    {' '}de {adProgress.length} capítulos
                  </div>
                );
              })()}

              {adProgress.map((e) => {
                const icon =
                  e.status === 'pending'  ? '⏳' :
                  e.status === 'probing'  ? '🔍' :
                  e.status === 'saving'   ? '💾' :
                  e.status === 'done'     ? '✅' :
                  e.status === 'skip'     ? '⏭️' : '❌';
                const color =
                  e.status === 'done'  ? '#00c864' :
                  e.status === 'error' ? 'var(--color-primary)' :
                  e.status === 'skip'  ? '#f0a500' :
                  'var(--color-text-muted)';
                return (
                  <div key={`${e.chapter}-${e.folderId}`} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '.8rem', padding: '6px 10px', borderRadius: 6, background: 'var(--color-bg-tertiary)' }}>
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
                    <span style={{ color: 'var(--color-text-secondary)', flexShrink: 0, minWidth: 80 }}>Cap. {e.chapter}</span>
                    <code style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>{e.folderId}</code>
                    <span style={{ color, marginLeft: 'auto', textAlign: 'right' }}>
                      {e.status === 'done'    && `${e.pages} páginas · ${e.pattern}`}
                      {e.status === 'saving'  && `Guardando ${e.pages} páginas…`}
                      {e.status === 'probing' && 'Detectando páginas…'}
                      {e.status === 'pending' && 'En cola'}
                      {e.status === 'skip'    && 'Ya existía'}
                      {e.status === 'error'   && (e.error ?? 'Error')}
                    </span>
                  </div>
                );
              })}

              {!adRunning && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => { setAdProgress([]); setAdFound([]); setAdTotal(0); }}
                  style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}
                >
                  <i className="fas fa-redo" /> Nueva búsqueda
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ EDIT MANGA ══ */}
      {tab === 'edit-manga' && (
        <div>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Selecciona el manga a editar</label>
            <select value={emId} onChange={(e) => loadMangaForEdit(e.target.value)}>
              <option value="">— Selecciona un manga —</option>
              {[...mangas].sort((a, b) => a.title.localeCompare(b.title)).map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>

          {emId && (
            <form className="user-form" onSubmit={submitEditManga}>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-bg-tertiary)', marginBottom: '1.5rem', fontSize: '.8rem', color: 'var(--color-text-muted)' }}>
                ID: <strong style={{ color: 'var(--color-text-secondary)' }}>{emId}</strong> — el ID no cambia al editar.
              </div>
              <div className="form-group">
                <label>Título *</label>
                <input value={emTitle} onChange={(e) => setEmTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>URL de portada *</label>
                <input value={emImage} onChange={(e) => setEmImage(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea value={emDesc} onChange={(e) => setEmDesc(e.target.value)} rows={4} />
              </div>
              <div className="form-group">
                <label>Géneros</label>
                <GenrePicker value={emGenres} onChange={setEmGenres} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Tipo</label>
                  <select value={emType} onChange={(e) => setEmType(e.target.value as Manga['type'])}>
                    <option>Manhwa</option><option>Manga</option><option>Manhua</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Estado</label>
                  <select value={emStatus} onChange={(e) => setEmStatus(e.target.value as Manga['status'])}>
                    <option>En Emision</option><option>Finalizado</option><option>Pausado</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha de añadido</label>
                  <input type="date" value={emDate} onChange={(e) => setEmDate(e.target.value)} />
                </div>
              </div>
              <div className="form-actions" style={{ justifyContent: 'space-between' }}>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Guardando…' : <><i className="fas fa-save" /> Guardar Cambios</>}
                </button>
                {deleteBtn(deleteManga, 'Eliminar Manga')}
              </div>
            </form>
          )}
        </div>
      )}

      {/* ══ EDIT CHAPTER ══ */}
      {tab === 'edit-chapter' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label>Manga</label>
              <select value={ecMangaId} onChange={(e) => { setEcMangaId(e.target.value); setEcChapterNum(''); setEcBaseUrl(''); setEcManual(''); setEcProbeResult(null); }}>
                <option value="">— Selecciona un manga —</option>
                {[...mangas].sort((a, b) => a.title.localeCompare(b.title)).map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Capítulo</label>
              <select value={ecChapterNum}
                onChange={(e) => { setEcChapterNum(e.target.value); loadChapterForEdit(ecMangaId, e.target.value); }}
                disabled={!ecMangaId}>
                <option value="">— Cap. —</option>
                {(mangas.find((m) => m.id === ecMangaId)?.chapters ?? []).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {ecLoading && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '.875rem' }}>
              <i className="fas fa-spinner fa-spin" /> Cargando capítulo…
            </p>
          )}

          {ecChapterNum && !ecLoading && (
            <form className="user-form" onSubmit={submitEditChapter}>
              <div className="form-group">
                <label>Base URL</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={ecBaseUrl} onChange={(e) => { setEcBaseUrl(e.target.value); setEcProbeResult(null); }}
                    placeholder="https://dashboard.olympusbiblioteca.com/storage/comics/743/58809/" style={{ flex: 1 }} />
                  {probeBtn(ecProbePages, ecProbing || !ecBaseUrl.trim(), ecProbing)}
                </div>
                <span className="form-hint">
                  {ecProbeResult
                    ? <span style={{ color: '#00c864' }}><i className="fas fa-check-circle" /> {ecProbeResult.count} páginas · patrón <strong>{ecProbeResult.pattern}</strong></span>
                    : 'Cambia la URL y pulsa Detectar para actualizar las páginas automáticamente.'}
                </span>
              </div>
              <div className="form-group">
                <label>Páginas *</label>
                <textarea value={ecManual} onChange={(e) => setEcManual(e.target.value)}
                  required rows={8} placeholder={'01.webp\n02.webp\n1_01.webp\n1_02.webp'} />
                {ecManual && (
                  <span className="form-hint">{parseManualPages(ecManual).length} páginas</span>
                )}
              </div>
              <div className="form-actions" style={{ justifyContent: 'space-between' }}>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Guardando…' : <><i className="fas fa-save" /> Guardar Cambios</>}
                </button>
                {deleteBtn(deleteChapter, 'Eliminar Capítulo')}
              </div>
            </form>
          )}
        </div>
      )}

      {/* ══ DELETE ══ */}
      {tab === 'delete' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

          {/* ── Eliminar manga ── */}
          <div>
            <h3 style={{ color: 'var(--color-text)', fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-book" style={{ color: 'var(--color-primary)' }} /> Eliminar Manga
            </h3>
            <div className="form-group">
              <label>Selecciona el manga a eliminar</label>
              <select value={dMangaId} onChange={(e) => setDMangaId(e.target.value)}>
                <option value="">— Selecciona un manga —</option>
                {[...mangas].sort((a, b) => a.title.localeCompare(b.title)).map((m) => (
                  <option key={m.id} value={m.id}>{m.title} ({m.chapters.length} caps)</option>
                ))}
              </select>
            </div>
            {dMangaId && (() => {
              const m = mangas.find((x) => x.id === dMangaId);
              return m ? (
                <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(255,0,0,.06)', border: '1px solid rgba(255,0,0,.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '.875rem', color: 'var(--color-text-secondary)' }}>
                    <strong style={{ color: 'var(--color-text)' }}>{m.title}</strong>
                    <span style={{ color: 'var(--color-text-muted)', marginLeft: 8 }}>· {m.chapters.length} capítulos · ID: {m.id}</span>
                  </div>
                  <button
                    type="button"
                    onClick={doDeleteManga}
                    disabled={loading}
                    style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,0,0,.5)', background: 'rgba(255,0,0,.12)', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '.875rem', whiteSpace: 'nowrap' }}
                  >
                    <i className="fas fa-trash-alt" /> Eliminar manga y capítulos
                  </button>
                </div>
              ) : null;
            })()}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          {/* ── Eliminar capítulo ── */}
          <div>
            <h3 style={{ color: 'var(--color-text)', fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-file-alt" style={{ color: 'var(--color-primary)' }} /> Eliminar Capítulo
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label>Manga</label>
                <select value={dChMangaId} onChange={(e) => { setDChMangaId(e.target.value); setDChNum(''); }}>
                  <option value="">— Selecciona un manga —</option>
                  {[...mangas].sort((a, b) => a.title.localeCompare(b.title)).map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Capítulo</label>
                <select value={dChNum} onChange={(e) => setDChNum(e.target.value)} disabled={!dChMangaId}>
                  <option value="">— Cap. —</option>
                  {(mangas.find((m) => m.id === dChMangaId)?.chapters ?? []).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            {dChMangaId && dChNum && (
              <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(255,0,0,.06)', border: '1px solid rgba(255,0,0,.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '.875rem', color: 'var(--color-text-secondary)' }}>
                  Capítulo <strong>{dChNum}</strong> de <strong>{mangas.find((m) => m.id === dChMangaId)?.title}</strong>
                </span>
                <button
                  type="button"
                  onClick={doDeleteChapter}
                  disabled={loading}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,0,0,.5)', background: 'rgba(255,0,0,.12)', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '.875rem', whiteSpace: 'nowrap' }}
                >
                  <i className="fas fa-trash-alt" /> Eliminar capítulo
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Manga list summary */}
      <details style={{ marginTop: '3rem' }}>
        <summary style={{ cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '.875rem', userSelect: 'none' }}>
          Ver mangas en el catálogo ({mangas.length})
        </summary>
        <ul style={{ marginTop: '1rem', listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[...mangas].sort((a, b) => a.title.localeCompare(b.title)).map((m) => (
            <li key={m.id} style={{ fontSize: '.8rem', color: 'var(--color-text-secondary)', display: 'flex', gap: 12, alignItems: 'baseline' }}>
              <code style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>{m.id}</code>
              <span>{m.title}</span>
              <span style={{ color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{m.chapters.length} caps</span>
            </li>
          ))}
        </ul>
      </details>

    </div>
  );
}
