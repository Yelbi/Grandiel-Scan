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
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type Tab   = 'manga' | 'chapter';
type Alert = { type: 'ok' | 'err'; msg: string } | null;

/* ─── component ────────────────────────────────────── */
export default function AdminClient({ initialMangas }: { initialMangas: Manga[] }) {
  const [tab, setTab]       = useState<Tab>('manga');
  const [mangas, setMangas] = useState<Manga[]>(initialMangas);
  const [alert, setAlert]   = useState<Alert>(null);
  const [loading, setLoading] = useState(false);

  /* ── Manga form state ── */
  const [mTitle,   setMTitle]   = useState('');
  const [mImage,   setMImage]   = useState('');
  const [mDesc,    setMDesc]    = useState('');
  const [mGenres,  setMGenres]  = useState('');
  const [mType,    setMType]    = useState<Manga['type']>('Manhwa');
  const [mStatus,  setMStatus]  = useState<Manga['status']>('En Emision');
  const [mDate,    setMDate]    = useState(new Date().toISOString().split('T')[0]);

  /* ── Chapter form state ── */
  const [cMangaId,    setCMangaId]    = useState('');
  const [cNum,        setCNum]        = useState('');
  const [cBaseUrl,    setCBaseUrl]    = useState('');
  const [cMode,       setCMode]       = useState<'auto' | 'manual'>('auto');
  const [cCount,      setCCount]      = useState('');
  const [cExt,        setCExt]        = useState('webp');
  const [cManual,     setCManual]     = useState('');
  const [probing,     setProbing]     = useState(false);
  const [probeResult, setProbeResult] = useState<{ pattern: string; count: number } | null>(null);

  /* ─── probe pages ─────────────────────────── */
  async function probePages() {
    if (!cBaseUrl.trim()) {
      notify('err', 'Ingresa la Base URL primero.');
      return;
    }
    setProbing(true);
    setProbeResult(null);
    try {
      const res = await fetch('/api/admin/probe-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: cBaseUrl.trim(), ext: cExt.trim() || 'webp' }),
      });
      const json = await res.json();
      if (!res.ok) {
        notify('err', json.error ?? 'No se detectaron páginas.');
      } else {
        setCMode('manual');
        setCManual((json.pages as string[]).join('\n'));
        setProbeResult({ pattern: json.pattern, count: json.count });
        notify('ok', `✓ Detectadas ${json.count} páginas (patrón: ${json.pattern})`);
      }
    } catch {
      notify('err', 'Error de red al probar la URL.');
    } finally {
      setProbing(false);
    }
  }

  /* ─── helpers ─────────────────────────────── */
  function notify(type: 'ok' | 'err', msg: string) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 5000);
  }

  /* ─── SUBMIT: manga ───────────────────────── */
  async function submitManga(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const id = titleToId(mTitle);
    const today = new Date().toISOString().split('T')[0];

    const manga: Manga = {
      id,
      title: mTitle.trim(),
      slug:  mTitle.trim().toLowerCase(),
      image: mImage.trim(),
      description: mDesc.trim(),
      genres: mGenres.split(',').map((g) => g.trim()).filter(Boolean),
      type:   mType,
      status: mStatus,
      chapters: [],
      dateAdded: mDate || today,
      lastUpdated: mDate || today,
      latestChapter: 0,
    };

    const res = await fetch('/api/admin/manga', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manga),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      notify('err', json.error ?? 'Error desconocido');
    } else {
      notify('ok', `✓ Manga "${manga.title}" añadido (id: ${manga.id})`);
      setMangas((prev) => [...prev, manga]);
      setMTitle(''); setMImage(''); setMDesc(''); setMGenres('');
      setMType('Manhwa'); setMStatus('En Emision');
      setMDate(new Date().toISOString().split('T')[0]);
    }
  }

  /* ─── SUBMIT: chapter ─────────────────────── */
  async function submitChapter(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const pages =
      cMode === 'auto'
        ? generatePages(Number(cCount), cExt.trim() || 'webp')
        : parseManualPages(cManual);

    if (!pages.length) {
      notify('err', 'La lista de páginas está vacía.');
      setLoading(false);
      return;
    }

    const chapter = {
      mangaId: cMangaId,
      chapter: Number(cNum),
      ...(cBaseUrl.trim() ? { baseUrl: cBaseUrl.trim() } : {}),
      pages,
    };

    const res = await fetch('/api/admin/chapter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chapter),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      notify('err', json.error ?? 'Error desconocido');
    } else {
      const title = mangas.find((m) => m.id === cMangaId)?.title ?? cMangaId;
      notify('ok', `✓ Capítulo ${cNum} de "${title}" añadido (${pages.length} páginas)`);
      setCNum(''); setCBaseUrl(''); setCCount(''); setCManual('');
      setProbeResult(null); setCMode('auto');
    }
  }

  /* ─── render ──────────────────────────────── */
  return (
    <div className="curva" style={{ maxWidth: 720, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem' }}>
        <h1 style={{ color: 'var(--color-text)', textAlign: 'left', fontSize: '1.8rem', margin: '0 0 .4rem' }}>
          <i className="fas fa-tools" /> Panel de Administración
        </h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '.875rem' }}>
          Solo disponible en <code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 6px', borderRadius: 4 }}>npm run dev</code>.
          Los cambios se guardan en <code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 6px', borderRadius: 4 }}>public/data/</code> automáticamente.
        </p>
      </div>

      {/* Alert */}
      {alert && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '1.5rem',
          borderRadius: 8,
          background: alert.type === 'ok' ? 'rgba(0,200,100,.12)' : 'rgba(255,0,0,.12)',
          border: `1px solid ${alert.type === 'ok' ? 'rgba(0,200,100,.35)' : 'rgba(255,0,0,.35)'}`,
          color: alert.type === 'ok' ? '#00c864' : 'var(--color-primary)',
          fontSize: '.875rem',
        }}>
          {alert.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="novedades-tabs" style={{ marginBottom: '2rem' }}>
        <button className={`novedades-tab${tab === 'manga' ? ' active' : ''}`} onClick={() => setTab('manga')}>
          <i className="fas fa-book" /> Añadir Manga
        </button>
        <button className={`novedades-tab${tab === 'chapter' ? ' active' : ''}`} onClick={() => setTab('chapter')}>
          <i className="fas fa-plus-circle" /> Añadir Capítulo
        </button>
      </div>

      {/* ══ MANGA FORM ══ */}
      {tab === 'manga' && (
        <form className="user-form" onSubmit={submitManga}>
          <div className="form-group">
            <label>Título *</label>
            <input value={mTitle} onChange={(e) => setMTitle(e.target.value)} required placeholder="Ej: Solo Leveling" />
            {mTitle && (
              <span className="form-hint">ID generado: <strong>{titleToId(mTitle)}</strong></span>
            )}
          </div>

          <div className="form-group">
            <label>URL de portada *</label>
            <input value={mImage} onChange={(e) => setMImage(e.target.value)} required
              placeholder="https://... o /img/nombre.webp" />
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea value={mDesc} onChange={(e) => setMDesc(e.target.value)}
              rows={4} placeholder="Sinopsis del manga..." />
          </div>

          <div className="form-group">
            <label>Géneros</label>
            <input value={mGenres} onChange={(e) => setMGenres(e.target.value)}
              placeholder="Accion, Fantasia, Sistema" />
            <span className="form-hint">Separados por coma</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Tipo</label>
              <select value={mType} onChange={(e) => setMType(e.target.value as Manga['type'])}>
                <option>Manhwa</option>
                <option>Manga</option>
                <option>Manhua</option>
              </select>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select value={mStatus} onChange={(e) => setMStatus(e.target.value as Manga['status'])}>
                <option>En Emision</option>
                <option>Finalizado</option>
                <option>Pausado</option>
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

      {/* ══ CHAPTER FORM ══ */}
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
              <input type="number" min={1} value={cNum} onChange={(e) => setCNum(e.target.value)} required placeholder="1" />
            </div>
            <div className="form-group">
              <label>Base URL</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={cBaseUrl}
                  onChange={(e) => { setCBaseUrl(e.target.value); setProbeResult(null); }}
                  placeholder="https://dashboard.olympusbiblioteca.com/storage/comics/743/58809/"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={probePages}
                  disabled={probing || !cBaseUrl.trim()}
                  title="Detectar páginas automáticamente"
                  style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                  {probing
                    ? <><i className="fas fa-spinner fa-spin" /> Probando…</>
                    : <><i className="fas fa-search" /> Detectar</>}
                </button>
              </div>
              <span className="form-hint">
                {probeResult
                  ? <span style={{ color: '#00c864' }}>
                      <i className="fas fa-check-circle" /> {probeResult.count} páginas · patrón <strong>{probeResult.pattern}</strong>
                    </span>
                  : 'URL base donde están las imágenes. Haz clic en Detectar para auto-rellenar las páginas.'}
              </span>
            </div>
          </div>

          {/* Pages mode */}
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
                required={cMode === 'manual'}
                rows={6}
                placeholder={'01.webp\n02.webp\n12-1.webp\n12-2.webp\n13.webp'}
              />
            )}

            {cMode === 'auto' && cCount && (
              <span className="form-hint">
                Se generarán: {generatePages(Number(cCount), cExt || 'webp').slice(0, 5).join(', ')}
                {Number(cCount) > 5 ? ` … (${cCount} páginas)` : ''}
              </span>
            )}
            {cMode === 'manual' && cManual && (
              <span className="form-hint">
                {parseManualPages(cManual).length} páginas detectadas
              </span>
            )}
          </div>

          <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando…' : <><i className="fas fa-plus" /> Añadir Capítulo</>}
            </button>
          </div>
        </form>
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
