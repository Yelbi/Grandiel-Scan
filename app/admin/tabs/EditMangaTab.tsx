'use client';

import { useState } from 'react';
import type { Manga } from '@/lib/types';
import type { SharedTabProps } from '../admin-types';
import { GenrePicker } from './GenrePicker';

export function EditMangaTab({ mangas, setMangas, notify }: SharedTabProps) {
  const [loading,  setLoading]  = useState(false);
  const [emId,     setEmId]     = useState('');
  const [emTitle,  setEmTitle]  = useState('');
  const [emImage,  setEmImage]  = useState('');
  const [emDesc,   setEmDesc]   = useState('');
  const [emGenres, setEmGenres] = useState<string[]>([]);
  const [emType,   setEmType]   = useState<Manga['type']>('Manhwa');
  const [emStatus, setEmStatus] = useState<Manga['status']>('En Emision');
  const [emDate,   setEmDate]   = useState('');

  function loadForEdit(id: string) {
    setEmId(id);
    const m = mangas.find((x) => x.id === id);
    if (!m) return;
    setEmTitle(m.title); setEmImage(m.image); setEmDesc(m.description ?? '');
    setEmGenres(m.genres ?? []); setEmType(m.type); setEmStatus(m.status); setEmDate(m.dateAdded ?? '');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const payload = { id: emId, title: emTitle.trim(), slug: emTitle.trim().toLowerCase(), image: emImage.trim(), description: emDesc.trim(), genres: emGenres, type: emType, status: emStatus, dateAdded: emDate };
    const res  = await fetch('/api/admin/manga', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { notify('err', json.error ?? 'Error desconocido'); }
    else {
      notify('ok', `✓ Manga "${emTitle}" actualizado.`);
      setMangas((prev) => prev.map((m) => m.id === emId ? { ...m, ...json.manga } : m));
    }
  }

  async function deleteManga() {
    if (!window.confirm(`¿Eliminar "${emTitle}" y todos sus capítulos? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    const res  = await fetch('/api/admin/manga', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: emId }) });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { notify('err', json.error ?? 'Error desconocido'); }
    else {
      notify('ok', `✓ Manga eliminado (${json.removedChapters} capítulos borrados).`);
      setMangas((prev) => prev.filter((m) => m.id !== emId));
      setEmId(''); setEmTitle(''); setEmImage(''); setEmDesc(''); setEmGenres([]);
    }
  }

  return (
    <div>
      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label>Selecciona el manga a editar</label>
        <select value={emId} onChange={(e) => loadForEdit(e.target.value)}>
          <option value="">— Selecciona un manga —</option>
          {[...mangas].sort((a, b) => a.title.localeCompare(b.title)).map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
      </div>

      {emId && (
        <form className="user-form" onSubmit={submit}>
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-bg-tertiary)', marginBottom: '1.5rem', fontSize: '.8rem', color: 'var(--color-text-muted)' }}>
            ID: <strong style={{ color: 'var(--color-text-secondary)' }}>{emId}</strong> — el ID no cambia al editar.
          </div>
          <div className="form-group">
            <label>Título *</label>
            <input value={emTitle} onChange={(e) => setEmTitle(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>URL de portada *</label>
            <input value={emImage} onChange={(e) => setEmImage(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea value={emDesc} onChange={(e) => setEmDesc(e.target.value)} rows={4} />
          </div>
          <div className="form-group">
            <label>Géneros</label>
            <GenrePicker value={emGenres} onChange={setEmGenres} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Tipo</label>
              <select value={emType} onChange={(e) => setEmType(e.target.value as Manga['type'])}>
                <option>Manhwa</option><option>Manga</option><option>Manhua</option>
              </select>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select value={emStatus} onChange={(e) => setEmStatus(e.target.value as Manga['status'])}>
                <option>En Emision</option><option>Finalizado</option><option>Pausado</option>
              </select>
            </div>
            <div className="form-group">
              <label>Fecha de añadido</label>
              <input type="date" value={emDate} onChange={(e) => setEmDate(e.target.value)} />
            </div>
          </div>
          <div className="form-actions" style={{ justifyContent: 'space-between' }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando…' : <><i className="fas fa-save" /> Guardar Cambios</>}
            </button>
            <button type="button" onClick={deleteManga} disabled={loading}
              style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid rgba(255,0,0,.4)', background: 'rgba(255,0,0,.08)', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '.875rem' }}>
              <i className="fas fa-trash-alt" /> Eliminar Manga
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
