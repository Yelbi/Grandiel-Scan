'use client';

import { useState } from 'react';
import type { SharedTabProps } from '../admin-types';
import { parseNonNegativeNum } from '../admin-helpers';

export function DeleteTab({ mangas, setMangas, notify }: SharedTabProps) {
  const [loading,    setLoading]    = useState(false);
  const [dMangaId,   setDMangaId]   = useState('');
  const [dChMangaId, setDChMangaId] = useState('');
  const [dChNum,     setDChNum]     = useState('');

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

  return (
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
              <button type="button" onClick={doDeleteManga} disabled={loading}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,0,0,.5)', background: 'rgba(255,0,0,.12)', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '.875rem', whiteSpace: 'nowrap' }}>
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
            <button type="button" onClick={doDeleteChapter} disabled={loading}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,0,0,.5)', background: 'rgba(255,0,0,.12)', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '.875rem', whiteSpace: 'nowrap' }}>
              <i className="fas fa-trash-alt" /> Eliminar capítulo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
