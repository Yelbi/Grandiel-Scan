'use client';

import { useState } from 'react';
import type { SharedTabProps } from '../admin-types';
import { parseManualPages, parseNonNegativeNum } from '../admin-helpers';

export function EditChapterTab({ mangas, setMangas, notify }: SharedTabProps) {
  const [loading,       setLoading]       = useState(false);
  const [ecMangaId,     setEcMangaId]     = useState('');
  const [ecChapterNum,  setEcChapterNum]  = useState('');
  const [ecBaseUrl,     setEcBaseUrl]     = useState('');
  const [ecManual,      setEcManual]      = useState('');
  const [ecLoading,     setEcLoading]     = useState(false);
  const [ecProbing,     setEcProbing]     = useState(false);
  const [ecProbeResult, setEcProbeResult] = useState<{ pattern: string; count: number } | null>(null);

  async function loadChapter(mangaId: string, chapterNum: string) {
    if (!mangaId || !chapterNum) return;
    setEcLoading(true); setEcBaseUrl(''); setEcManual(''); setEcProbeResult(null);
    try {
      const res  = await fetch(`/api/admin/chapter?mangaId=${mangaId}&chapter=${chapterNum}`);
      const json = await res.json();
      if (!res.ok) { notify('err', json.error ?? 'Error cargando capítulo.'); }
      else { setEcBaseUrl(json.baseUrl ?? ''); setEcManual((json.pages as string[]).join('\n')); }
    } catch { notify('err', 'Error de red.'); }
    finally { setEcLoading(false); }
  }

  async function probePages() {
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

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const chapterNum = parseNonNegativeNum(ecChapterNum);
    if (chapterNum === null) {
      notify('err', 'El número de capítulo debe ser un número válido mayor o igual a 0.');
      setLoading(false); return;
    }
    const pages = parseManualPages(ecManual);
    if (!pages.length) { notify('err', 'La lista de páginas está vacía.'); setLoading(false); return; }
    const res  = await fetch('/api/admin/chapter', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mangaId: ecMangaId, chapter: chapterNum, pages, baseUrl: ecBaseUrl.trim() || undefined }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { notify('err', json.error ?? 'Error desconocido'); }
    else {
      const title = mangas.find((m) => m.id === ecMangaId)?.title ?? ecMangaId;
      notify('ok', `✓ Capítulo ${chapterNum} de "${title}" actualizado (${pages.length} páginas).`);
    }
  }

  async function deleteChapter() {
    if (!window.confirm(`¿Eliminar capítulo ${ecChapterNum}? Esta acción no se puede deshacer.`)) return;
    const chapterNum = parseNonNegativeNum(ecChapterNum);
    if (chapterNum === null) { notify('err', 'Capítulo inválido.'); return; }
    setLoading(true);
    const res  = await fetch('/api/admin/chapter', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mangaId: ecMangaId, chapter: chapterNum }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { notify('err', json.error ?? 'Error desconocido'); }
    else {
      const title = mangas.find((m) => m.id === ecMangaId)?.title ?? ecMangaId;
      notify('ok', `✓ Capítulo ${chapterNum} de "${title}" eliminado.`);
      setMangas((prev) => prev.map((m) =>
        m.id === ecMangaId ? { ...m, chapters: m.chapters.filter((n) => n !== chapterNum) } : m,
      ));
      setEcChapterNum(''); setEcBaseUrl(''); setEcManual(''); setEcProbeResult(null);
    }
  }

  return (
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
            onChange={(e) => { setEcChapterNum(e.target.value); loadChapter(ecMangaId, e.target.value); }}
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
        <form className="user-form" onSubmit={submit}>
          <div className="form-group">
            <label>Base URL</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={ecBaseUrl} onChange={(e) => { setEcBaseUrl(e.target.value); setEcProbeResult(null); }}
                placeholder="https://dashboard.olympusbiblioteca.com/storage/comics/743/58809/" style={{ flex: 1 }} />
              <button type="button" className="btn-primary" onClick={probePages}
                disabled={ecProbing || !ecBaseUrl.trim()} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                {ecProbing ? <><i className="fas fa-spinner fa-spin" /> Probando…</> : <><i className="fas fa-search" /> Detectar</>}
              </button>
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
            {ecManual && <span className="form-hint">{parseManualPages(ecManual).length} páginas</span>}
          </div>
          <div className="form-actions" style={{ justifyContent: 'space-between' }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando…' : <><i className="fas fa-save" /> Guardar Cambios</>}
            </button>
            <button type="button" onClick={deleteChapter} disabled={loading}
              style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid rgba(255,0,0,.4)', background: 'rgba(255,0,0,.08)', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '.875rem' }}>
              <i className="fas fa-trash-alt" /> Eliminar Capítulo
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
