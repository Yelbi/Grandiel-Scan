'use client';

import { useState } from 'react';
import type { BulkEntry, SharedTabProps } from '../admin-types';
import { parseBulkList, parseHtmlChapterEntries, parseCdnUrlList, buildViewerUrl } from '../admin-helpers';

export function BulkUploadTab({ mangas, setMangas, notify }: SharedTabProps) {
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
  const [bCdnRaw,         setBCdnRaw]         = useState('');
  const [bCdnOpen,        setBCdnOpen]        = useState(false);

  async function runBulk() {
    const entries = parseBulkList(bList);
    if (!entries.length || !bMangaId || !bComicBase.trim()) {
      notify('err', 'Completa el manga, URL base y la lista de capítulos.'); return;
    }
    const comicBase = bComicBase.replace(/\/$/, '');
    setBRunning(true);
    setBProgress(entries.map((e) => ({ ...e, status: 'pending', pages: 0, pattern: '' })));
    let okCount = 0;

    for (let i = 0; i < entries.length; i++) {
      const { chapter, folderId, viewerUrl: viewerFromList } = entries[i];
      const baseUrl  = `${comicBase}/${folderId}/`;
      const viewerUrl = viewerFromList ?? bViewerByFolder[folderId]
        ?? (bViewerTemplate.trim() ? buildViewerUrl(bViewerTemplate.trim(), folderId, chapter) : undefined);

      setBProgress((prev) => prev.map((e, idx) => idx === i ? { ...e, status: 'probing' } : e));

      let probeJson: { pages?: string[]; pattern?: string; count?: number; error?: string };
      try {
        const res = await fetch('/api/admin/probe-chapter', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseUrl, ext: bExt, chapterHint: chapter, viewerUrl }),
        });
        probeJson = await res.json();
        if (!res.ok || !probeJson.pages?.length) {
          setBProgress((prev) => prev.map((e, idx) => idx === i ? { ...e, status: 'error', error: probeJson.error ?? 'Sin páginas detectadas' } : e));
          continue;
        }
      } catch {
        setBProgress((prev) => prev.map((e, idx) => idx === i ? { ...e, status: 'error', error: 'Error de red' } : e));
        continue;
      }

      setBProgress((prev) => prev.map((e, idx) => idx === i ? { ...e, status: 'saving', pages: probeJson.count ?? 0, pattern: probeJson.pattern ?? '' } : e));

      try {
        const res = await fetch('/api/admin/chapter', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mangaId: bMangaId, chapter, baseUrl, pages: probeJson.pages }),
        });
        const saveJson = await res.json();
        if (!res.ok) {
          setBProgress((prev) => prev.map((e, idx) => idx === i ? { ...e, status: saveJson.error?.includes('ya existe') ? 'skip' : 'error', error: saveJson.error } : e));
        } else {
          okCount++;
          setBProgress((prev) => prev.map((e, idx) => idx === i ? { ...e, status: 'done' } : e));
          setMangas((prev) => prev.map((m) => m.id === bMangaId
            ? { ...m, chapters: [...new Set([...m.chapters, chapter])].sort((a, b) => a - b), latestChapter: Math.max(m.latestChapter, chapter) }
            : m,
          ));
        }
      } catch {
        setBProgress((prev) => prev.map((e, idx) => idx === i ? { ...e, status: 'error', error: 'Error de red al guardar' } : e));
      }
    }

    setBRunning(false);
    notify('ok', `Carga masiva terminada: ${okCount}/${entries.length} capítulos subidos.`);
  }

  const statusIcon = (s: BulkEntry['status']) =>
    s === 'pending' ? '⏳' : s === 'probing' ? '🔍' : s === 'saving' ? '💾' : s === 'done' ? '✅' : s === 'skip' ? '⏭️' : '❌';
  const statusColor = (s: BulkEntry['status']) =>
    s === 'done' ? '#00c864' : s === 'error' ? 'var(--color-primary)' : s === 'skip' ? '#f0a500' : 'var(--color-text-muted)';

  return (
    <div>
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
        <input value={bComicBase} onChange={(e) => setBComicBase(e.target.value)}
          placeholder="https://dashboard.olympusbiblioteca.com/storage/comics/743" disabled={bRunning} />
        <span className="form-hint">El sistema construye: <code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>URL base / carpeta /</code> para cada capítulo</span>
      </div>

      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label>Plantilla URL del lector <span style={{ fontWeight: 'normal', color: 'var(--color-text-muted)' }}>(opcional)</span></label>
        <input value={bViewerTemplate} onChange={(e) => setBViewerTemplate(e.target.value)}
          placeholder="https://olympusbiblioteca.com/leer/manga/52/{folderId}" disabled={bRunning} />
        <span className="form-hint">
          Usa <code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>{'{folderId}'}</code> y/o <code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>{'{chapter}'}</code> como variables.
        </span>
      </div>

      {/* ── Import from CDN URLs ── */}
      <div style={{ marginBottom: '1rem', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
        <button type="button" onClick={() => setBCdnOpen((v) => !v)} disabled={bRunning}
          style={{ width: '100%', padding: '10px 14px', background: 'var(--color-bg-tertiary)', border: 'none', color: 'var(--color-text-secondary)', fontSize: '.85rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-images" /> Importar desde URLs de páginas (CDN)
          <i className={`fas fa-chevron-${bCdnOpen ? 'up' : 'down'}`} style={{ marginLeft: 'auto' }} />
        </button>
        {bCdnOpen && (
          <div style={{ padding: '12px 14px', background: 'var(--color-bg-secondary)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--color-text-muted)' }}>
              Pega URLs de imágenes del CDN (una por línea). Formato soportado:{' '}
              <code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>
                https://cdn.arenascan.com/arena-bucket/<strong>173838</strong>/<strong>53</strong>/2.webp
              </code>
            </p>
            <textarea value={bCdnRaw} onChange={(e) => setBCdnRaw(e.target.value)} rows={6}
              placeholder={'https://cdn.arenascan.com/arena-bucket/173838/1/01.webp\nhttps://cdn.arenascan.com/arena-bucket/173838/53/1.webp'}
              style={{ fontFamily: 'monospace', fontSize: '.75rem', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="button" className="btn-primary" disabled={!bCdnRaw.trim()}
                onClick={() => {
                  const result = parseCdnUrlList(bCdnRaw);
                  if (!result) { notify('err', 'No se detectó un patrón de CDN válido.'); return; }
                  if (!bComicBase.trim()) setBComicBase(result.base);
                  const lines = result.entries.map((e) => `${e.chapter}: ${e.folderId}`).join('\n');
                  setBList((prev) => prev.trim() ? prev.trim() + '\n' + lines : lines);
                  setBCdnRaw(''); setBCdnOpen(false);
                  notify('ok', `✓ Base: ${result.base} · ${result.entries.length} capítulo(s) importados.`);
                }}>
                <i className="fas fa-file-import" /> Extraer y añadir a la lista
              </button>
              {bCdnRaw.trim() && (
                <span style={{ fontSize: '.8rem', color: 'var(--color-text-muted)' }}>
                  {(() => { const r = parseCdnUrlList(bCdnRaw); if (!r) return 'Formato no reconocido'; return `Base: ${r.base.split('/').slice(-1)[0]} · ${r.entries.length} cap.`; })()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Import from HTML ── */}
      <div style={{ marginBottom: '1.5rem', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
        <button type="button" onClick={() => setBHtmlOpen((v) => !v)} disabled={bRunning}
          style={{ width: '100%', padding: '10px 14px', background: 'var(--color-bg-tertiary)', border: 'none', color: 'var(--color-text-secondary)', fontSize: '.85rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-code" /> Importar lista desde HTML
          <i className={`fas fa-chevron-${bHtmlOpen ? 'up' : 'down'}`} style={{ marginLeft: 'auto' }} />
        </button>
        {bHtmlOpen && (
          <div style={{ padding: '12px 14px', background: 'var(--color-bg-secondary)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--color-text-muted)' }}>
              Pega el HTML de la página de capítulos. Soporta Olympus, Ikigai, Kumanga, ArenaScan y otros.
            </p>
            <textarea value={bHtmlRaw} onChange={(e) => setBHtmlRaw(e.target.value)} rows={6}
              placeholder='Pega aquí el HTML con los <a href="/capitulo/…"> …'
              style={{ fontFamily: 'monospace', fontSize: '.75rem', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="button" className="btn-primary" disabled={!bHtmlRaw.trim()}
                onClick={() => {
                  const entries = parseHtmlChapterEntries(bHtmlRaw);
                  if (!entries.length) { notify('err', 'No se encontraron capítulos en el HTML.'); return; }
                  const result = entries.map((e) => e.viewerUrl ? `${e.chapter}: ${e.folderId}: ${e.viewerUrl}` : `${e.chapter}: ${e.folderId}`).join('\n');
                  setBList((prev) => prev.trim() ? prev.trim() + '\n' + result : result);
                  setBViewerByFolder((prev) => { const next = { ...prev }; entries.forEach((e) => { if (e.viewerUrl) next[e.folderId] = e.viewerUrl; }); return next; });
                  setBHtmlRaw(''); setBHtmlOpen(false);
                  const withViewer = entries.filter((e) => !!e.viewerUrl).length;
                  notify('ok', `✓ ${entries.length} capítulos importados${withViewer > 0 ? ` (${withViewer} con URL lectora)` : ''}.`);
                }}>
                <i className="fas fa-file-import" /> Extraer y añadir a la lista
              </button>
              {bHtmlRaw.trim() && (
                <span style={{ fontSize: '.8rem', color: 'var(--color-text-muted)' }}>
                  {(() => { const e = parseHtmlChapterEntries(bHtmlRaw); if (!e.length) return 'Sin resultados'; const v = e.filter((x) => !!x.viewerUrl).length; return `${e.length} caps${v > 0 ? ` · ${v} con URL lectora` : ''}`; })()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label>Lista de capítulos * <span style={{ fontWeight: 'normal', color: 'var(--color-text-muted)' }}>(formato: capítulo: carpeta[: viewerUrl])</span></label>
        <textarea value={bList} onChange={(e) => setBList(e.target.value)} disabled={bRunning} rows={10}
          placeholder={'28: 65076\n29: 66022: /capitulo/66022/comic-titulo'} style={{ fontFamily: 'monospace', fontSize: '.85rem' }} />
        {bList && !bRunning && <span className="form-hint">{parseBulkList(bList).length} capítulos en la lista</span>}
      </div>

      {!bRunning && bProgress.length === 0 && (
        <button type="button" className="btn-primary" onClick={runBulk} disabled={!bMangaId || !bComicBase.trim() || !bList.trim()}>
          <i className="fas fa-layer-group" /> Detectar y Subir Todos
        </button>
      )}
      {bRunning && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '.875rem', marginBottom: '1rem' }}>
          <i className="fas fa-spinner fa-spin" /> Procesando capítulos… no cierres esta página.
        </p>
      )}
      {bProgress.length > 0 && !bRunning && (
        <button type="button" className="btn-primary" onClick={() => { setBProgress([]); setBList(''); setBViewerByFolder({}); }} style={{ marginBottom: '1rem' }}>
          <i className="fas fa-redo" /> Nueva carga
        </button>
      )}

      {bProgress.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: '1rem' }}>
          {!bRunning && (() => {
            const done = bProgress.filter((e) => e.status === 'done').length;
            const skip = bProgress.filter((e) => e.status === 'skip').length;
            const err  = bProgress.filter((e) => e.status === 'error').length;
            return (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-bg-tertiary)', fontSize: '.8rem', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                <strong style={{ color: '#00c864' }}>{done} subidos</strong>
                {skip > 0 && <> · <strong style={{ color: '#f0a500' }}>{skip} ya existían</strong></>}
                {err  > 0 && <> · <strong style={{ color: 'var(--color-primary)' }}>{err} errores</strong></>}
                {' '}de {bProgress.length} capítulos
              </div>
            );
          })()}
          {bProgress.map((e) => (
            <div key={e.chapter} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '.8rem', padding: '6px 10px', borderRadius: 6, background: 'var(--color-bg-tertiary)' }}>
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
        </div>
      )}
    </div>
  );
}
