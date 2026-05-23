'use client';

import { useState } from 'react';
import type { SharedTabProps } from '../admin-types';
import { generatePages, parseManualPages, parseNonNegativeNum } from '../admin-helpers';

export function AddChapterTab({ mangas, setMangas, notify }: SharedTabProps) {
  const [loading,     setLoading]     = useState(false);
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

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const chapterNum = parseNonNegativeNum(cNum);
    if (chapterNum === null) {
      notify('err', 'El número de capítulo debe ser un número válido mayor o igual a 0.');
      setLoading(false); return;
    }
    const pages = cMode === 'auto' ? generatePages(Number(cCount), cExt.trim() || 'webp') : parseManualPages(cManual);
    if (!pages.length) { notify('err', 'La lista de páginas está vacía.'); setLoading(false); return; }
    const chapter = { mangaId: cMangaId, chapter: chapterNum, ...(cBaseUrl.trim() ? { baseUrl: cBaseUrl.trim() } : {}), pages };
    const res  = await fetch('/api/admin/chapter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(chapter) });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { notify('err', json.error ?? 'Error desconocido'); }
    else {
      const title = mangas.find((m) => m.id === cMangaId)?.title ?? cMangaId;
      notify('ok', `✓ Capítulo ${chapterNum} de "${title}" añadido (${pages.length} páginas)`);
      setCNum(''); setCBaseUrl(''); setCCount(''); setCManual(''); setCSlugHint(''); setProbeResult(null); setCMode('auto');
      setMangas((prev) => prev.map((m) =>
        m.id === cMangaId
          ? { ...m, chapters: [...new Set([...m.chapters, chapterNum])].sort((a, b) => a - b), latestChapter: Math.max(m.latestChapter, chapterNum) }
          : m,
      ));
    }
  }

  return (
    <form className="user-form" onSubmit={submit}>
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
            <button type="button" className="btn-primary" onClick={probePages}
              disabled={probing || !cBaseUrl.trim()} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
              {probing ? <><i className="fas fa-spinner fa-spin" /> Probando…</> : <><i className="fas fa-search" /> Detectar</>}
            </button>
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
        <input value={cSlugHint} onChange={(e) => { setCSlugHint(e.target.value); setProbeResult(null); }} placeholder="c-463-ingeniero" />
        <span className="form-hint">
          Solo necesario si las páginas usan un nombre textual en vez de números (ej: <code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 4px', borderRadius: 3 }}>c-463-ingeniero_01.webp</code>)
        </span>
      </div>
      <div className="form-group">
        <label>URL del visor <span style={{ fontWeight: 'normal', color: 'var(--color-text-muted)' }}>(opcional — para CDNs con hash)</span></label>
        <input value={cViewerUrl} onChange={(e) => { setCViewerUrl(e.target.value); setProbeResult(null); }}
          placeholder="https://olympusbiblioteca.com/capitulo/40429/comic-titulo" />
        <span className="form-hint">
          Si las páginas tienen nombres con hash impredecible, pega aquí la URL del capítulo en el sitio de lectura.
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
  );
}
