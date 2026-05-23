'use client';

import { useState } from 'react';
import type { VerifyEntry, SharedTabProps } from '../admin-types';

export function VerifyTab({ mangas, notify }: SharedTabProps) {
  const [vrMangaId,  setVrMangaId]  = useState('');
  const [vrEntries,  setVrEntries]  = useState<VerifyEntry[]>([]);
  const [vrRunning,  setVrRunning]  = useState(false);
  const [vrSaving,   setVrSaving]   = useState(false);
  const [vrFilter,   setVrFilter]   = useState<'all' | 'ok' | 'different' | 'error' | 'no-url'>('all');
  const [vrLoaded,   setVrLoaded]   = useState(false);
  const [vrProgress, setVrProgress] = useState<{ current: number; total: number } | null>(null);

  async function loadChapters(mangaId: string) {
    if (!mangaId) return;
    setVrEntries([]); setVrLoaded(false); setVrFilter('all');
    try {
      const res  = await fetch(`/api/admin/chapters?mangaId=${encodeURIComponent(mangaId)}`);
      const data = await res.json() as Array<{ chapter: number; baseUrl: string | null; pageCount: number; firstPage: string | null }>;
      if (!res.ok) { notify('err', (data as unknown as { error: string }).error ?? 'Error al cargar.'); return; }
      setVrEntries(data.map((row) => ({
        chapter: row.chapter, baseUrl: row.baseUrl ?? '',
        currentCount: row.pageCount ?? 0, ext: row.firstPage?.split('.').pop() || 'webp',
        status: row.baseUrl ? 'idle' : 'no-url',
      })));
      setVrLoaded(true);
    } catch { notify('err', 'Error de red al cargar capítulos.'); }
  }

  async function probeOne(entry: VerifyEntry): Promise<void> {
    setVrEntries((prev) => prev.map((e) => e.chapter === entry.chapter ? { ...e, status: 'probing', errorMsg: undefined } : e));
    try {
      const res  = await fetch('/api/admin/probe-chapter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: entry.baseUrl, ext: entry.ext, chapterHint: entry.chapter }),
      });
      const json = await res.json() as { pages?: string[]; pattern?: string; error?: string };
      if (!res.ok || !json.pages?.length) {
        setVrEntries((prev) => prev.map((e) => e.chapter === entry.chapter
          ? { ...e, status: 'error', errorMsg: json.error ?? 'Sin páginas detectadas' } : e));
      } else {
        const isDiff = json.pages.length !== entry.currentCount;
        setVrEntries((prev) => prev.map((e) => e.chapter === entry.chapter
          ? { ...e, status: isDiff ? 'different' : 'ok', detectedCount: json.pages!.length, detectedPattern: json.pattern, detectedPages: json.pages } : e));
      }
    } catch {
      setVrEntries((prev) => prev.map((e) => e.chapter === entry.chapter ? { ...e, status: 'error', errorMsg: 'Error de red' } : e));
    }
  }

  async function runVerify() {
    if (vrRunning) return;
    const snapshot = vrEntries.filter((e) => e.baseUrl);
    if (!snapshot.length) { notify('err', 'No hay capítulos con URL para verificar.'); return; }
    setVrRunning(true);
    setVrProgress({ current: 0, total: snapshot.length });
    setVrEntries((prev) => prev.map((e) =>
      e.baseUrl ? { ...e, status: 'idle', detectedCount: undefined, detectedPattern: undefined, detectedPages: undefined, errorMsg: undefined } : e,
    ));
    let done = 0;
    for (const entry of snapshot) {
      await probeOne(entry);
      done++;
      setVrProgress({ current: done, total: snapshot.length });
    }
    setVrRunning(false); setVrProgress(null);
    notify('ok', 'Verificación completada.');
  }

  async function retryOne(chapterNum: number) {
    if (vrRunning || vrSaving) return;
    const entry = vrEntries.find((e) => e.chapter === chapterNum);
    if (!entry?.baseUrl) return;
    await probeOne(entry);
  }

  async function updateEntry(chapterNum: number) {
    const entry = vrEntries.find((e) => e.chapter === chapterNum);
    if (!entry?.detectedPages?.length) return;
    setVrSaving(true);
    try {
      const res  = await fetch('/api/admin/chapter', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mangaId: vrMangaId, chapter: chapterNum, pages: entry.detectedPages }),
      });
      const json = await res.json();
      if (!res.ok) { notify('err', json.error ?? 'Error al actualizar.'); }
      else {
        const newCount = entry.detectedPages.length;
        setVrEntries((prev) => prev.map((e) => e.chapter === chapterNum ? { ...e, status: 'ok', currentCount: newCount } : e));
      }
    } catch { notify('err', 'Error de red al actualizar.'); }
    setVrSaving(false);
  }

  async function updateAllDifferent() {
    const different = vrEntries.filter((e) => e.status === 'different' && e.detectedPages?.length);
    if (!different.length) return;
    setVrSaving(true);
    let updated = 0;
    for (const entry of different) {
      try {
        const res = await fetch('/api/admin/chapter', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mangaId: vrMangaId, chapter: entry.chapter, pages: entry.detectedPages }),
        });
        if (res.ok) {
          updated++;
          setVrEntries((prev) => prev.map((e) => e.chapter === entry.chapter
            ? { ...e, status: 'ok', currentCount: entry.detectedPages!.length } : e));
        }
      } catch { /* continue */ }
    }
    setVrSaving(false);
    notify('ok', `${updated}/${different.length} capítulos actualizados.`);
  }

  const filtered = vrEntries.filter((e) => {
    if (vrFilter === 'ok')        return e.status === 'ok';
    if (vrFilter === 'different') return e.status === 'different';
    if (vrFilter === 'error')     return e.status === 'error';
    if (vrFilter === 'no-url')    return !e.baseUrl;
    return true;
  });

  return (
    <div>
      {/* Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Manga</label>
          <select value={vrMangaId} onChange={(e) => { setVrMangaId(e.target.value); setVrEntries([]); setVrLoaded(false); }}>
            <option value="">— Selecciona un manga —</option>
            {[...mangas].sort((a, b) => a.title.localeCompare(b.title)).map((m) => (
              <option key={m.id} value={m.id}>{m.title} ({m.chapters.length} caps)</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn-primary" onClick={() => loadChapters(vrMangaId)} disabled={!vrMangaId || vrRunning} style={{ whiteSpace: 'nowrap' }}>
          <i className="fas fa-download" /> Cargar capítulos
        </button>
      </div>

      {!vrLoaded && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)', fontSize: '.875rem' }}>
          <i className="fas fa-shield-alt" style={{ fontSize: '2rem', marginBottom: '1rem', display: 'block', opacity: 0.3 }} />
          Selecciona un manga y haz clic en &ldquo;Cargar capítulos&rdquo; para ver el estado de sus páginas.
        </div>
      )}

      {vrLoaded && vrEntries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', fontSize: '.875rem' }}>
          Este manga no tiene capítulos registrados.
        </div>
      )}

      {vrLoaded && vrEntries.length > 0 && (
        <>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
            {[
              { label: 'Total',     value: vrEntries.length,                                       color: 'var(--color-text)'           },
              { label: 'Con URL',   value: vrEntries.filter((e) => e.baseUrl).length,               color: 'var(--color-text-secondary)' },
              { label: 'Sin URL',   value: vrEntries.filter((e) => !e.baseUrl).length,              color: 'var(--color-text-muted)'     },
              { label: 'OK',        value: vrEntries.filter((e) => e.status === 'ok').length,        color: '#00c864'                     },
              { label: 'Distintos', value: vrEntries.filter((e) => e.status === 'different').length, color: '#f0a500'                     },
              { label: 'Error',     value: vrEntries.filter((e) => e.status === 'error').length,     color: 'var(--color-primary)'        },
            ].map((s) => (
              <div key={s.label} style={{ padding: '5px 12px', borderRadius: 8, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '.75rem' }}>{s.label}</span>
                <span style={{ fontWeight: 700, fontSize: '.9rem', color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {vrProgress && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                <span><i className="fas fa-spinner fa-spin" /> Verificando… {vrProgress.current}/{vrProgress.total}</span>
                <span>{Math.round((vrProgress.current / vrProgress.total) * 100)}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--color-bg-tertiary)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(vrProgress.current / vrProgress.total) * 100}%`, background: 'var(--color-primary)', transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <button type="button" className="btn-primary" onClick={runVerify} disabled={vrRunning || vrSaving}>
              {vrRunning ? <><i className="fas fa-spinner fa-spin" /> Verificando…</> : <><i className="fas fa-search" /> Verificar todos</>}
            </button>
            {vrEntries.some((e) => e.status === 'different') && (
              <button type="button" onClick={updateAllDifferent} disabled={vrSaving || vrRunning}
                style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid rgba(240,165,0,.4)', background: 'rgba(240,165,0,.1)', color: '#f0a500', cursor: 'pointer', fontSize: '.875rem' }}>
                {vrSaving ? <><i className="fas fa-spinner fa-spin" /> Actualizando…</> : <><i className="fas fa-sync-alt" /> Actualizar distintos ({vrEntries.filter((e) => e.status === 'different').length})</>}
              </button>
            )}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', flexWrap: 'wrap' }}>
            {([
              { id: 'all',       label: `Todos (${vrEntries.length})` },
              { id: 'ok',        label: `OK (${vrEntries.filter((e) => e.status === 'ok').length})` },
              { id: 'different', label: `Distintos (${vrEntries.filter((e) => e.status === 'different').length})` },
              { id: 'error',     label: `Error (${vrEntries.filter((e) => e.status === 'error').length})` },
              { id: 'no-url',    label: `Sin URL (${vrEntries.filter((e) => !e.baseUrl).length})` },
            ] as const).map((f) => (
              <button key={f.id} type="button" onClick={() => setVrFilter(f.id)}
                style={{ padding: '4px 12px', borderRadius: 20, fontSize: '.78rem', cursor: 'pointer', border: vrFilter === f.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)', background: vrFilter === f.id ? 'rgba(255,50,50,.12)' : 'transparent', color: vrFilter === f.id ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Chapter list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {filtered.map((entry) => (
              <div key={entry.chapter} style={{
                padding: '9px 14px', borderRadius: 8, background: 'var(--color-bg-tertiary)',
                border: entry.status === 'different' ? '1px solid rgba(240,165,0,.3)' : entry.status === 'ok' ? '1px solid rgba(0,200,100,.2)' : entry.status === 'error' ? '1px solid rgba(255,50,50,.2)' : '1px solid var(--color-border)',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--color-text)', minWidth: 58 }}>Cap. {entry.chapter}</span>
                  <span style={{ fontSize: '.78rem', color: 'var(--color-text-muted)', minWidth: 60 }}>{entry.currentCount} pág.</span>
                  {entry.status === 'different' && <span style={{ fontSize: '.8rem', color: '#f0a500', fontWeight: 600 }}>→ {entry.detectedCount} detectadas</span>}
                  {entry.status === 'ok' && entry.detectedCount !== undefined && <span style={{ fontSize: '.78rem', color: '#00c864' }}>✓ {entry.detectedCount} coinciden</span>}
                  {entry.detectedPattern && <span style={{ fontSize: '.72rem', color: 'var(--color-text-muted)', background: 'var(--color-bg)', padding: '2px 7px', borderRadius: 4, fontFamily: 'monospace' }}>{entry.detectedPattern}</span>}
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {entry.status === 'idle'    && (
                      <button type="button" onClick={() => retryOne(entry.chapter)} disabled={vrRunning || vrSaving}
                        style={{ padding: '3px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '.72rem' }}>
                        <i className="fas fa-play" /> Probar
                      </button>
                    )}
                    {entry.status === 'probing' && <span style={{ fontSize: '.78rem', color: 'var(--color-text-muted)' }}><i className="fas fa-spinner fa-spin" /> probando…</span>}
                    {entry.status === 'no-url'  && <span style={{ fontSize: '.72rem', color: 'var(--color-text-muted)', padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,.05)' }}>Sin URL</span>}
                    {entry.status === 'ok'      && <span style={{ fontSize: '.72rem', color: '#00c864', padding: '2px 8px', borderRadius: 10, background: 'rgba(0,200,100,.1)', fontWeight: 600 }}>✓ OK</span>}
                    {entry.status === 'error'   && (
                      <button type="button" onClick={() => retryOne(entry.chapter)} disabled={vrRunning || vrSaving}
                        style={{ padding: '3px 10px', borderRadius: 8, border: '1px solid rgba(255,50,50,.3)', background: 'rgba(255,0,0,.08)', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '.72rem' }}>
                        <i className="fas fa-redo" /> Reintentar
                      </button>
                    )}
                    {entry.status === 'different' && (
                      <button type="button" onClick={() => updateEntry(entry.chapter)} disabled={vrSaving || vrRunning}
                        style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(240,165,0,.4)', background: 'rgba(240,165,0,.1)', color: '#f0a500', cursor: 'pointer', fontSize: '.78rem', whiteSpace: 'nowrap' }}>
                        <i className="fas fa-sync-alt" /> Actualizar
                      </button>
                    )}
                  </div>
                </div>
                {entry.status === 'error' && entry.errorMsg && (
                  <div style={{ fontSize: '.75rem', color: 'var(--color-primary)', background: 'rgba(255,0,0,.06)', padding: '4px 8px', borderRadius: 4, wordBreak: 'break-all' }}>
                    {entry.errorMsg}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
