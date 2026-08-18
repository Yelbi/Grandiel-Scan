'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import type { Manga } from '@/lib/types';
import type { Tab, Alert } from './admin-types';
import { TABS } from './admin-types';
import { AddMangaTab }     from './tabs/AddMangaTab';
import { AddChapterTab }   from './tabs/AddChapterTab';
import { BulkUploadTab }   from './tabs/BulkUploadTab';
import { AutoDiscoverTab } from './tabs/AutoDiscoverTab';
import { VerifyTab }       from './tabs/VerifyTab';
import { SourcesTab }      from './tabs/SourcesTab';
import { EditMangaTab }    from './tabs/EditMangaTab';
import { EditChapterTab }  from './tabs/EditChapterTab';
import { DeleteTab }       from './tabs/DeleteTab';
import { ReportsTab }      from './tabs/ReportsTab';

export default function AdminClient({ initialMangas }: { initialMangas: Manga[] }) {
  const [tab,    setTab]    = useState<Tab>('manga');
  const [mangas, setMangas] = useState<Manga[]>(initialMangas);
  const [alert,  setAlert]  = useState<Alert>(null);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
  }, []);

  function notify(type: 'ok' | 'err', msg: string) {
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    setAlert({ type, msg });
    alertTimerRef.current = setTimeout(() => setAlert(null), 5000);
  }

  const sortedMangas = useMemo(
    () => [...mangas].sort((a, b) => a.title.localeCompare(b.title)),
    [mangas],
  );

  const tabProps = { mangas, setMangas, notify };

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

      {/* Tab content */}
      {tab === 'manga'        && <AddMangaTab     {...tabProps} />}
      {tab === 'chapter'      && <AddChapterTab   {...tabProps} />}
      {tab === 'bulk'         && <BulkUploadTab   {...tabProps} />}
      {tab === 'autodiscover' && <AutoDiscoverTab {...tabProps} />}
      {tab === 'verify'       && <VerifyTab       {...tabProps} />}
      {tab === 'sources'      && <SourcesTab      notify={notify} />}
      {tab === 'edit-manga'   && <EditMangaTab    {...tabProps} />}
      {tab === 'edit-chapter' && <EditChapterTab  {...tabProps} />}
      {tab === 'delete'       && <DeleteTab       {...tabProps} />}
      {tab === 'reports'      && <ReportsTab      notify={notify} />}

      {/* Manga list summary */}
      <details style={{ marginTop: '3rem' }}>
        <summary style={{ cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '.875rem', userSelect: 'none' }}>
          Ver mangas en el catálogo ({mangas.length})
        </summary>
        <ul style={{ marginTop: '1rem', listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sortedMangas.map((m) => (
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
