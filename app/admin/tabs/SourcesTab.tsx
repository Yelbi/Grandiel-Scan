'use client';

import { useCallback, useEffect, useState } from 'react';

/** Fila de configuración tal como la devuelve GET /api/admin/source */
interface SourceRow {
  id: string;
  title: string;
  latestChapter: number;
  sourceUrl: string | null;
  sourceCdnBase: string | null;
  sourceExt: string;
  autoSync: boolean;
  lastSyncedAt: string | null;
}

interface SyncRunRow {
  id: number;
  mangaId: string;
  status: string;
  chaptersAdded: number;
  chapters: number[];
  detail: string | null;
  durationMs: number | null;
  createdAt: string;
}

type Notify = (type: 'ok' | 'err', msg: string) => void;

const STATUS_LABEL: Record<string, string> = {
  added:   '✅ capítulos añadidos',
  nothing: '· sin novedades',
  partial: '⚠️ parcial',
  error:   '❌ error',
  skipped: '⏭️ sin configurar',
};

export function SourcesTab({ notify }: { notify: Notify }) {
  const [rows,    setRows]    = useState<SourceRow[]>([]);
  const [recent,  setRecent]  = useState<SyncRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId,  setBusyId]  = useState<string | null>(null);
  const [openId,  setOpenId]  = useState<string | null>(null);
  const [onlyConfigured, setOnlyConfigured] = useState(false);
  const [draft,   setDraft]   = useState<Partial<SourceRow>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/admin/source');
      const json = await res.json();
      if (!res.ok) { notify('err', json.error ?? 'No se pudo cargar la configuración.'); return; }
      setRows(json.mangas ?? []);
      setRecent(json.recent ?? []);
    } catch {
      notify('err', 'Error de red al cargar la configuración.');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { void load(); }, [load]);

  function startEdit(row: SourceRow) {
    setOpenId(openId === row.id ? null : row.id);
    setDraft({
      sourceUrl:     row.sourceUrl     ?? '',
      sourceCdnBase: row.sourceCdnBase ?? '',
      sourceExt:     row.sourceExt     || 'webp',
      autoSync:      row.autoSync,
    });
  }

  async function save(mangaId: string) {
    setBusyId(mangaId);
    try {
      const res = await fetch('/api/admin/source', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mangaId, ...draft }),
      });
      const json = await res.json();
      if (!res.ok) { notify('err', json.error ?? 'No se pudo guardar.'); return; }
      setRows((prev) => prev.map((r) => (r.id === mangaId ? { ...r, ...json } : r)));
      notify('ok', 'Origen guardado.');
      setOpenId(null);
    } catch {
      notify('err', 'Error de red al guardar.');
    } finally {
      setBusyId(null);
    }
  }

  /** Solo lee la lista de capítulos del origen, sin tocar la base de datos. */
  async function testDiscover(sourceUrl: string) {
    if (!sourceUrl.trim()) { notify('err', 'Escribe primero la URL de la serie.'); return; }
    setBusyId('discover');
    try {
      const res = await fetch('/api/admin/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'discover', sourceUrl: sourceUrl.trim() }),
      });
      const json = await res.json();
      if (json.error) { notify('err', json.error); return; }
      const caps = (json.chapters ?? []) as { chapter: number; id: string }[];
      const preview = caps.slice(-6).map((c) => c.chapter).join(', ');
      notify('ok', `Detectados ${caps.length} capítulos vía ${json.strategy}. Últimos: ${preview}`);
    } catch {
      notify('err', 'Error de red al leer el origen.');
    } finally {
      setBusyId(null);
    }
  }

  async function syncNow(mangaId: string, dryRun: boolean) {
    setBusyId(mangaId);
    try {
      const res = await fetch('/api/admin/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', mangaId, dryRun }),
      });
      const json = await res.json();
      if (!res.ok) { notify('err', json.error ?? 'Falló la sincronización.'); return; }
      const r = json.results?.[0];
      const label = dryRun ? 'Simulación' : 'Sincronización';
      if (!r)                      notify('err', `${label}: no se procesó nada.`);
      else if (r.chaptersAdded?.length) notify('ok', `${label}: capítulos ${r.chaptersAdded.join(', ')}${dryRun ? ' (no guardados)' : ' añadidos'}.`);
      else                          notify('err', `${label}: ${r.detail ?? 'sin novedades'}`);
      if (!dryRun) void load();
    } catch {
      notify('err', 'Error de red al sincronizar.');
    } finally {
      setBusyId(null);
    }
  }

  const visible = onlyConfigured ? rows.filter((r) => r.sourceUrl) : rows;
  const active  = rows.filter((r) => r.autoSync && r.sourceUrl).length;

  return (
    <div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '.875rem', marginBottom: '1rem' }}>
        Cada manga necesita dos datos: la <strong>página de la serie</strong> en el sitio de origen
        (de ahí se leen los capítulos publicados) y la <strong>base del CDN</strong> — la misma que
        escribes en Auto-Descubrir, sin el id del capítulo al final. Con eso, el cron busca
        capítulos nuevos cada 3 horas y los sube solo.
      </p>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '.875rem' }}>
          <strong style={{ color: active > 0 ? '#00c864' : 'var(--color-text-muted)' }}>{active}</strong>
          {' '}de {rows.length} con sincronización activa
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.875rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={onlyConfigured} onChange={(e) => setOnlyConfigured(e.target.checked)} />
          Solo los configurados
        </label>
        <button className="btn" onClick={() => void load()} disabled={loading}>
          <i className="fas fa-sync-alt" aria-hidden="true" /> Recargar
        </button>
      </div>

      {loading && <p style={{ color: 'var(--color-text-muted)' }}>Cargando…</p>}

      {!loading && visible.map((row) => (
        <div key={row.id} className="curva" style={{ padding: '1rem', marginBottom: '.75rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.1rem' }} title={row.autoSync ? 'Sincronización activa' : 'Desactivada'}>
              {row.autoSync ? '🟢' : '⚪'}
            </span>
            <strong style={{ flex: 1, minWidth: '12rem' }}>{row.title}</strong>
            <span style={{ fontSize: '.8rem', color: 'var(--color-text-muted)' }}>
              últ. cap. {row.latestChapter}
              {row.lastSyncedAt && ` · revisado ${new Date(row.lastSyncedAt).toLocaleString('es')}`}
            </span>
            <button className="btn" onClick={() => startEdit(row)}>
              <i className="fas fa-cog" aria-hidden="true" /> {openId === row.id ? 'Cerrar' : 'Configurar'}
            </button>
          </div>

          {openId === row.id && (
            <div style={{ marginTop: '1rem', display: 'grid', gap: '.75rem' }}>
              <label style={{ display: 'grid', gap: '.25rem', fontSize: '.85rem' }}>
                URL de la serie en el sitio de origen
                <input
                  className="input" type="url" placeholder="https://olympusbiblioteca.com/series/comic-nano-machine"
                  value={draft.sourceUrl ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, sourceUrl: e.target.value }))}
                />
              </label>

              <label style={{ display: 'grid', gap: '.25rem', fontSize: '.85rem' }}>
                Base del CDN (sin el id del capítulo)
                <input
                  className="input" type="url" placeholder="https://dashboard.olympusscans.com/storage/comics/168"
                  value={draft.sourceCdnBase ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, sourceCdnBase: e.target.value }))}
                />
              </label>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'grid', gap: '.25rem', fontSize: '.85rem' }}>
                  Extensión
                  <input
                    className="input" style={{ width: '6rem' }} value={draft.sourceExt ?? 'webp'}
                    onChange={(e) => setDraft((d) => ({ ...d, sourceExt: e.target.value }))}
                  />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox" checked={draft.autoSync ?? false}
                    onChange={(e) => setDraft((d) => ({ ...d, autoSync: e.target.checked }))}
                  />
                  Sincronizar automáticamente
                </label>
              </div>

              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                <button className="btn" disabled={busyId !== null} onClick={() => void save(row.id)}>
                  <i className="fas fa-save" aria-hidden="true" /> Guardar
                </button>
                <button className="btn" disabled={busyId !== null} onClick={() => void testDiscover(draft.sourceUrl ?? '')}>
                  <i className="fas fa-search" aria-hidden="true" /> Probar lectura del origen
                </button>
                <button className="btn" disabled={busyId !== null} onClick={() => void syncNow(row.id, true)}>
                  <i className="fas fa-vial" aria-hidden="true" /> Simular (sin guardar)
                </button>
                <button className="btn" disabled={busyId !== null} onClick={() => void syncNow(row.id, false)}>
                  <i className="fas fa-bolt" aria-hidden="true" /> Sincronizar ahora
                </button>
              </div>
              <p style={{ fontSize: '.78rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Guarda antes de simular o sincronizar: esos botones leen lo que hay en la base de datos.
              </p>
            </div>
          )}
        </div>
      ))}

      {/* Historial */}
      {recent.length > 0 && (
        <>
          <h3 style={{ marginTop: '2rem', marginBottom: '.75rem' }}>Últimas sincronizaciones</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--color-text-muted)' }}>
                  <th style={{ padding: '.4rem' }}>Cuándo</th>
                  <th style={{ padding: '.4rem' }}>Manga</th>
                  <th style={{ padding: '.4rem' }}>Resultado</th>
                  <th style={{ padding: '.4rem' }}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--color-border, #333)' }}>
                    <td style={{ padding: '.4rem', whiteSpace: 'nowrap' }}>
                      {new Date(r.createdAt).toLocaleString('es')}
                    </td>
                    <td style={{ padding: '.4rem' }}>{r.mangaId}</td>
                    <td style={{ padding: '.4rem', whiteSpace: 'nowrap' }}>
                      {STATUS_LABEL[r.status] ?? r.status}
                      {r.chapters?.length > 0 && ` (${r.chapters.join(', ')})`}
                    </td>
                    <td style={{ padding: '.4rem', color: 'var(--color-text-muted)' }}>{r.detail ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
