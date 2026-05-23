'use client';

import { useState } from 'react';
import type { Manga } from '@/lib/types';
import type { SharedTabProps } from '../admin-types';
import { titleToId } from '../admin-helpers';
import { GenrePicker } from './GenrePicker';

export function AddMangaTab({ mangas, setMangas, notify }: SharedTabProps) {
  const [loading,  setLoading]  = useState(false);
  const [mTitle,   setMTitle]   = useState('');
  const [mImage,   setMImage]   = useState('');
  const [mDesc,    setMDesc]    = useState('');
  const [mGenres,  setMGenres]  = useState<string[]>([]);
  const [mType,    setMType]    = useState<Manga['type']>('Manhwa');
  const [mStatus,  setMStatus]  = useState<Manga['status']>('En Emision');
  const [mDate,    setMDate]    = useState(new Date().toISOString().split('T')[0]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const id    = titleToId(mTitle);
    const today = new Date().toISOString().split('T')[0];
    const manga: Manga = {
      id, title: mTitle.trim(), slug: id,
      image: mImage.trim(), description: mDesc.trim(),
      genres: mGenres, type: mType, status: mStatus, chapters: [],
      dateAdded: mDate || today, lastUpdated: mDate || today, latestChapter: 0,
    };
    const res  = await fetch('/api/admin/manga', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(manga) });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { notify('err', json.error ?? 'Error desconocido'); }
    else {
      notify('ok', `✓ Manga "${manga.title}" añadido (id: ${manga.id})`);
      setMangas((prev) => [...prev, manga]);
      setMTitle(''); setMImage(''); setMDesc(''); setMGenres([]);
      setMType('Manhwa'); setMStatus('En Emision');
      setMDate(new Date().toISOString().split('T')[0]);
    }
  }

  return (
    <form className="user-form" onSubmit={submit}>
      <div className="form-group">
        <label>Título *</label>
        <input value={mTitle} onChange={(e) => setMTitle(e.target.value)} required placeholder="Ej: Solo Leveling" />
        {mTitle && <span className="form-hint">ID generado: <strong>{titleToId(mTitle)}</strong></span>}
      </div>
      <div className="form-group">
        <label>URL de portada *</label>
        <input value={mImage} onChange={(e) => setMImage(e.target.value)} required placeholder="https://... o /img/nombre.webp" />
      </div>
      <div className="form-group">
        <label>Descripción</label>
        <textarea value={mDesc} onChange={(e) => setMDesc(e.target.value)} rows={4} placeholder="Sinopsis del manga..." />
      </div>
      <div className="form-group">
        <label>Géneros</label>
        <GenrePicker value={mGenres} onChange={setMGenres} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>Tipo</label>
          <select value={mType} onChange={(e) => setMType(e.target.value as Manga['type'])}>
            <option>Manhwa</option><option>Manga</option><option>Manhua</option>
          </select>
        </div>
        <div className="form-group">
          <label>Estado</label>
          <select value={mStatus} onChange={(e) => setMStatus(e.target.value as Manga['status'])}>
            <option>En Emision</option><option>Finalizado</option><option>Pausado</option>
          </select>
        </div>
        <div className="form-group">
          <label>Fecha de añadido</label>
          <input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} />
        </div>
      </div>
      <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Guardando…' : <><i className="fas fa-save" /> Guardar Manga</>}
        </button>
      </div>
    </form>
  );
}
