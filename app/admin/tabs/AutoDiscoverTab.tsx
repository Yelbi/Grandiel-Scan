'use client';

import { useState } from 'react';
import type { BulkEntry, SharedTabProps } from '../admin-types';
import { parseNonNegativeNum } from '../admin-helpers';

export function AutoDiscoverTab({ mangas, setMangas, notify }: SharedTabProps) {
  const [adMangaId,      setAdMangaId]      = useState('');
  const [adBase,         setAdBase]         = useState('');
  const [adExt,          setAdExt]          = useState('webp');
  const [adStart,        setAdStart]        = useState('');
  const [adEnd,          setAdEnd]          = useState('');
  const [adStartChap,    setAdStartChap]    = useState('');
  const [adSlugHint,     setAdSlugHint]     = useState('');
  const [adScanning,     setAdScanning]     = useState(false);
  const [adScanProgress, setAdScanProgress] = useState<{ scanned: number; total: number; pattern: string; patternIdx: number; patternCount: number } | null>(null);
  const [adRunning,      setAdRunning]      = useState(false);
  const [adFound,        setAdFound]        = useState<{ folderId: number; chapter: number }[]>([]);
  const [adTotal,        setAdTotal]        = useState(0);
  const [adProgress,     setAdProgress]     = useState<BulkEntry[]>([]);
  const [adAdjustIdx,    setAdAdjustIdx]    = useState<number | null>(null);
  const [adAdjustVal,    setAdAdjustVal]    = useState('');

  async function scanFolders() {
    if (!adBase.trim() || !adStart || !adEnd) { notify('err', 'Completa la URL base y el rango de folders.'); return; }
    setAdScanning(true); setAdFound([]); setAdTotal(0); setAdProgress([]); setAdScanProgress(null);
    try {
      const res = await fetch('/api/admin/scan-folders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comicBase: adBase.trim(), folderStart: Number(adStart), folderEnd: Number(adEnd), ext: adExt || 'webp', slugHint: adSlugHint.trim() || undefined }),
      });
      if (!res.ok || res.headers.get('content-type')?.includes('application/json')) {
        const json = await res.json(); notify('err', json.error ?? 'Error al escanear.'); return;
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
        const lines = buffer.split('\n'); buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'hit')      { setAdFound((prev) => [...prev, { folderId: event.folderId as number, chapter: startChap + hitCount++ }]); }
            else if (event.type === 'progress') { setAdScanProgress({ scanned: event.scanned as number, total: event.total as number, pattern: event.pattern as string, patternIdx: event.patternIdx as number, patternCount: event.patternCount as number }); }
            else if (event.type === 'done')     { setAdTotal(event.total as number); if (hitCount === 0) notify('err', 'No se encontraron folders con páginas en ese rango.'); }
            else if (event.type === 'error')    { notify('err', String(event.message ?? 'Error al escanear.')); }
          } catch { /* línea malformada */ }
        }
      }
    } catch { notify('err', 'Error de red al escanear.'); }
    finally { setAdScanning(false); setAdScanProgress(null); }
  }

  async function runAutoDiscover() {
    if (!adFound.length || !adMangaId) { notify('err', 'Selecciona un manga y escanea primero.'); return; }
    const comicBase = adBase.replace(/\/$/, '');
    setAdRunning(true);
    setAdProgress(adFound.map((e) => ({ chapter: e.chapter, folderId: String(e.folderId), status: 'pending', pages: 0, pattern: '' })));
    let doneCount = 0;

    for (let i = 0; i < adFound.length; i++) {
      const { chapter, folderId } = adFound[i];
      const baseUrl = `${comicBase}/${folderId}/`;
      setAdProgress((prev) => prev.map((e, idx) => idx === i ? { ...e, status: 'probing' } : e));

      let probeJson: { pages?: string[]; pattern?: string; count?: number; error?: string };
      try {
        const res = await fetch('/api/admin/probe-chapter', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseUrl, ext: adExt || 'webp', chapterHint: chapter, slugHint: adSlugHint.trim() || undefined }),
        });
        probeJson = await res.json();
        if (!res.ok || !probeJson.pages?.length) {
          setAdProgress((prev) => prev.map((e, idx) => idx === i ? { ...e, status: 'error', error: probeJson.error ?? 'Sin páginas detectadas' } : e));
          continue;
        }
      } catch {
        setAdProgress((prev) => prev.map((e, idx) => idx === i ? { ...e, status: 'error', error: 'Error de red' } : e));
        continue;
      }

      setAdProgress((prev) => prev.map((e, idx) => idx === i ? { ...e, status: 'saving', pages: probeJson.count ?? 0, pattern: probeJson.pattern ?? '' } : e));

      try {
        const res = await fetch('/api/admin/chapter', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mangaId: adMangaId, chapter, baseUrl, pages: probeJson.pages }),
        });
        const saveJson = await res.json();
        if (!res.ok) {
          setAdProgress((prev) => prev.map((e, idx) => idx === i ? { ...e, status: saveJson.error?.includes('ya existe') ? 'skip' : 'error', error: saveJson.error } : e));
        } else {
          doneCount++;
          setAdProgress((prev) => prev.map((e, idx) => idx === i ? { ...e, status: 'done' } : e));
          setMangas((prev) => prev.map((m) => m.id === adMangaId
            ? { ...m, chapters: [...new Set([...m.chapters, chapter])].sort((a, b) => a - b), latestChapter: Math.max(m.latestChapter, chapter) }
            : m,
          ));
        }
      } catch {
        setAdProgress((prev) => prev.map((e, idx) => idx === i ? { ...e, status: 'error', error: 'Error de red al guardar' } : e));
      }
    }

    setAdRunning(false);
    notify('ok', `Auto-descubrir terminado: ${doneCount}/${adFound.length} capítulos subidos.`);
  }

  const statusIcon  = (s: BulkEntry['status']) => s === 'pending' ? '⏳' : s === 'probing' ? '🔍' : s === 'saving' ? '💾' : s === 'done' ? '✅' : s === 'skip' ? '⏭️' : '❌';
  const statusColor = (s: BulkEntry['status']) => s === 'done' ? '#00c864' : s === 'error' ? 'var(--color-primary)' : s === 'skip' ? '#f0a500' : 'var(--color-text-muted)';

  return (
    <div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '.875rem', marginBottom: '1.5rem' }}>
        Escanea un rango de folders para descubrir automáticamente qué carpetas tienen páginas.
      </p>

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
          <input value={adBase} onChange={(e) => { setAdBase(e.target.value); setAdFound([]); setAdProgress([]); }}
            placeholder="https://dashboard.olympusbiblioteca.com/storage/comics/463" disabled={adRunning} />
          <span className="form-hint">Solo el ID del cómic, sin la carpeta del capítulo.</span>
        </div>
        <div className="form-group">
          <label>Slug de páginas <span style={{ fontWeight: 'normal', color: 'var(--color-text-muted)' }}>(opcional)</span></label>
          <input value={adSlugHint} onChange={(e) => { setAdSlugHint(e.target.value); setAdFound([]); setAdProgress([]); }}
            placeholder="c-463-ingeniero" disabled={adRunning} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="form-group">
          <label>Folder ID desde *</label>
          <input type="number" min={1} value={adStart} onChange={(e) => { setAdStart(e.target.value); setAdFound([]); setAdProgress([]); }} placeholder="39000" disabled={adRunning} />
        </div>
        <div className="form-group">
          <label>Folder ID hasta *</label>
          <input type="number" min={1} value={adEnd} onChange={(e) => { setAdEnd(e.target.value); setAdFound([]); setAdProgress([]); }} placeholder="42000" disabled={adRunning} />
          <span className="form-hint">Máximo 100,000 folders</span>
        </div>
        <div className="form-group">
          <label>Capítulo inicial</label>
          <input type="number" min={1} step={1} value={adStartChap} onChange={(e) => setAdStartChap(e.target.value)} placeholder="1" disabled={adRunning} />
          <span className="form-hint">Se asignan en orden</span>
        </div>
      </div>

      {!adRunning && (
        <button type="button" className="btn-primary" onClick={scanFolders}
          disabled={adScanning || !adBase.trim() || !adStart || !adEnd}
          style={{ marginBottom: adScanning ? '0.75rem' : '1.5rem' }}>
          {adScanning ? <><i className="fas fa-spinner fa-spin" /> Escaneando…</> : <><i className="fas fa-bolt" /> Escanear Folders</>}
        </button>
      )}

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
            <div style={{ height: '100%', borderRadius: 4, background: 'var(--color-primary)',
              width: `${Math.round(((adScanProgress.patternIdx * adScanProgress.total + adScanProgress.scanned) / (adScanProgress.patternCount * adScanProgress.total)) * 100)}%`,
              transition: 'width 0.2s ease' }} />
          </div>
        </div>
      )}

      {!adScanning && adTotal > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-bg-tertiary)', fontSize: '.8rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          Escaneados <strong>{adTotal}</strong> folders ·{' '}
          {adFound.length > 0 ? <strong style={{ color: '#00c864' }}>{adFound.length} encontrados</strong> : <strong style={{ color: 'var(--color-primary)' }}>0 encontrados</strong>}
        </div>
      )}

      {adFound.length > 0 && !adRunning && adProgress.length === 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
            Folders encontrados — edita los números o usa <strong>↓ Ajustar</strong> para corregir el offset:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
            {adFound.map((e, idx) => (
              <div key={e.folderId} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.8rem', padding: '5px 10px', borderRadius: 6, background: 'var(--color-bg-tertiary)' }}>
                  <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>Cap.</span>
                  <input type="number" min={1} step={1} value={e.chapter}
                    onChange={(ev) => { const n = parseNonNegativeNum(ev.target.value); if (n === null) return; setAdAdjustIdx(null); setAdFound((prev) => prev.map((x, i) => i === idx ? { ...x, chapter: n } : x)); }}
                    style={{ width: 70, padding: '2px 6px', borderRadius: 4, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: '.8rem' }} />
                  <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                  <code style={{ color: 'var(--color-text-secondary)', flex: 1 }}>folder {e.folderId}</code>
                  {idx < adFound.length - 1 && (
                    <button type="button" title="Corregir numeración desde esta fila hacia abajo"
                      onClick={() => { if (adAdjustIdx === idx) { setAdAdjustIdx(null); setAdAdjustVal(''); } else { setAdAdjustIdx(idx); setAdAdjustVal(String(e.chapter)); } }}
                      style={{ padding: '2px 8px', borderRadius: 4, fontSize: '.75rem', cursor: 'pointer', flexShrink: 0, border: `1px solid ${adAdjustIdx === idx ? 'var(--color-primary)' : 'var(--color-border)'}`, background: adAdjustIdx === idx ? 'rgba(255,0,0,.1)' : 'transparent', color: adAdjustIdx === idx ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                      ↓ Ajustar
                    </button>
                  )}
                </div>
                {adAdjustIdx === idx && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, background: 'rgba(255,0,0,.06)', border: '1px solid rgba(255,0,0,.2)', fontSize: '.8rem', marginLeft: 8 }}>
                    <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>Desde aquí, capítulo correcto:</span>
                    <input type="number" min={1} step={1} value={adAdjustVal} onChange={(ev) => setAdAdjustVal(ev.target.value)}
                      style={{ width: 70, padding: '2px 6px', borderRadius: 4, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: '.8rem' }} autoFocus />
                    <button type="button" onClick={() => { const n = parseNonNegativeNum(adAdjustVal); if (n === null) return; setAdFound((prev) => prev.map((x, i) => i < idx ? x : { ...x, chapter: n + (i - idx) })); setAdAdjustIdx(null); setAdAdjustVal(''); }}
                      style={{ padding: '3px 10px', borderRadius: 4, background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '.8rem' }}>
                      Aplicar
                    </button>
                    <button type="button" onClick={() => { setAdAdjustIdx(null); setAdAdjustVal(''); }}
                      style={{ padding: '3px 8px', borderRadius: 4, background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', cursor: 'pointer', fontSize: '.8rem' }}>
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
            <button type="button" onClick={() => { setAdFound([]); setAdTotal(0); setAdAdjustIdx(null); setAdAdjustVal(''); }}
              style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '.875rem' }}>
              <i className="fas fa-redo" /> Re-escanear
            </button>
          </div>
        </div>
      )}

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
          {adProgress.map((e) => (
            <div key={`${e.chapter}-${e.folderId}`} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '.8rem', padding: '6px 10px', borderRadius: 6, background: 'var(--color-bg-tertiary)' }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{statusIcon(e.status)}</span>
              <span style={{ color: 'var(--color-text-secondary)', flexShrink: 0, minWidth: 80 }}>Cap. {e.chapter}</span>
              <code style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>{e.folderId}</code>
              <span style={{ color: statusColor(e.status), marginLeft: 'auto', textAlign: 'right' }}>
                {e.status === 'done'    && `${e.pages} páginas · ${e.pattern}`}
                {e.status === 'saving'  && `Guardando ${e.pages} páginas…`}
                {e.status === 'probing' && 'Detectando páginas…'}
                {e.status === 'pending' && 'En cola'}
                {e.status === 'skip'    && 'Ya existía'}
                {e.status === 'error'   && (e.error ?? 'Error')}
              </span>
            </div>
          ))}
          {!adRunning && (
            <button type="button" className="btn-primary"
              onClick={() => { setAdProgress([]); setAdFound([]); setAdTotal(0); }}
              style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}>
              <i className="fas fa-redo" /> Nueva búsqueda
            </button>
          )}
        </div>
      )}
    </div>
  );
}
