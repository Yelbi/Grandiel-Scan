'use client';

import { useState } from 'react';
import type { ReportRow, SharedTabProps } from '../admin-types';

const REASON_LABELS: Record<string, string> = {
  incomplete:    'Páginas incompletas',
  not_loading:   'No carga / imágenes rotas',
  wrong_chapter: 'Capítulo equivocado',
  low_quality:   'Mala calidad',
  other:         'Otro',
};

export function ReportsTab({ notify }: Pick<SharedTabProps, 'notify'>) {
  const [reportsList,    setReportsList]    = useState<ReportRow[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsLoaded,  setReportsLoaded]  = useState(false);
  const [reportsFilter,  setReportsFilter]  = useState<'all' | 'pending' | 'resolved'>('pending');

  async function loadReports(filter: 'all' | 'pending' | 'resolved') {
    setReportsLoading(true);
    try {
      const res  = await fetch(`/api/admin/reports?status=${filter}`);
      const data = await res.json() as ReportRow[];
      setReportsList(Array.isArray(data) ? data : []);
      setReportsLoaded(true);
    } catch { notify('err', 'Error al cargar reportes.'); }
    finally { setReportsLoading(false); }
  }

  async function resolveReport(id: number, newStatus: 'pending' | 'resolved') {
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) { notify('err', 'Error al actualizar el reporte.'); return; }
      setReportsList((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r));
    } catch { notify('err', 'Error de conexión.'); }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {(['pending', 'resolved', 'all'] as const).map((f) => (
          <button key={f} type="button"
            onClick={() => { setReportsFilter(f); loadReports(f); }}
            style={{
              padding: '6px 16px', borderRadius: 20, fontSize: '.8rem', cursor: 'pointer',
              border: reportsFilter === f ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: reportsFilter === f ? 'rgba(255,0,0,.12)' : 'transparent',
              color: reportsFilter === f ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: reportsFilter === f ? 600 : 400, transition: 'all 0.15s',
            }}>
            {f === 'pending' ? 'Pendientes' : f === 'resolved' ? 'Resueltos' : 'Todos'}
          </button>
        ))}
        <button type="button" onClick={() => loadReports(reportsFilter)}
          style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 20, fontSize: '.8rem', cursor: 'pointer', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)' }}>
          <i className="fas fa-sync-alt" /> Actualizar
        </button>
      </div>

      {!reportsLoaded && !reportsLoading && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)', fontSize: '.875rem' }}>
          <i className="fas fa-flag" style={{ fontSize: '2rem', marginBottom: '1rem', display: 'block', opacity: 0.3 }} />
          Selecciona un filtro para cargar los reportes.
        </div>
      )}

      {reportsLoading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '.875rem' }}>
          <i className="fas fa-spinner fa-spin" /> Cargando reportes…
        </div>
      )}

      {!reportsLoading && reportsList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reportsList.map((r) => (
            <div key={r.id} style={{
              padding: '14px 16px', borderRadius: 10, background: 'var(--color-bg-tertiary)',
              border: r.status === 'pending' ? '1px solid rgba(255,165,0,.25)' : '1px solid rgba(0,200,100,.15)',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '.72rem', fontWeight: 600, background: 'rgba(255,255,255,.06)', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                  {r.type === 'chapter' ? '📖 Capítulo' : r.type === 'suggestion' ? '💡 Sugerencia' : '⚠️ Queja'}
                </span>
                {r.mangaId && (
                  <span style={{ fontSize: '.82rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                    {r.mangaId}{r.chapter != null ? ` · Cap. ${r.chapter}` : ''}
                  </span>
                )}
                <span style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: 12, fontSize: '.72rem', fontWeight: 700, background: r.status === 'pending' ? 'rgba(255,165,0,.15)' : 'rgba(0,200,100,.12)', color: r.status === 'pending' ? '#f0a500' : '#00c864', flexShrink: 0 }}>
                  {r.status === 'pending' ? 'Pendiente' : 'Resuelto'}
                </span>
              </div>
              {r.reason && (
                <div style={{ fontSize: '.82rem', color: 'var(--color-text)', fontWeight: 500 }}>
                  <span style={{ color: 'var(--color-text-muted)', marginRight: 6 }}>Motivo:</span>
                  {REASON_LABELS[r.reason] ?? r.reason}
                </div>
              )}
              {r.description && (
                <div style={{ fontSize: '.8rem', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,.03)', borderRadius: 6, padding: '8px 10px', borderLeft: '3px solid var(--color-border)' }}>
                  {r.description}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                <span style={{ fontSize: '.75rem', color: 'var(--color-text-muted)' }}>
                  {new Date(r.createdAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
                <button type="button" onClick={() => resolveReport(r.id, r.status === 'pending' ? 'resolved' : 'pending')}
                  style={{ marginLeft: 'auto', padding: '4px 14px', borderRadius: 8, fontSize: '.78rem', cursor: 'pointer', border: 'none', background: r.status === 'pending' ? 'rgba(0,200,100,.15)' : 'rgba(255,255,255,.06)', color: r.status === 'pending' ? '#00c864' : 'var(--color-text-muted)', transition: 'all 0.15s' }}>
                  {r.status === 'pending' ? <><i className="fas fa-check" /> Marcar resuelto</> : <><i className="fas fa-undo" /> Reabrir</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {reportsLoaded && !reportsLoading && reportsList.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '.875rem' }}>
          No hay reportes {reportsFilter === 'pending' ? 'pendientes' : reportsFilter === 'resolved' ? 'resueltos' : ''}.
        </div>
      )}
    </div>
  );
}
