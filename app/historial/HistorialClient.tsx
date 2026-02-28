'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useHistoryContext } from '@/components/providers/HistoryProvider';
import type { Manga } from '@/lib/types';

function relativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`;
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}

export default function HistorialClient({ mangas }: { mangas: Manga[] }) {
  const { history, clearHistory } = useHistoryContext();

  const items = history.map((entry) => ({
    entry,
    manga: mangas.find((m) => m.id === entry.mangaId),
  }));

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title">
          <i className="fas fa-history" /> Historial de Lectura
        </h1>
        {history.length > 0 && (
          <button
            className="btn"
            onClick={() => {
              if (confirm('¿Borrar todo el historial?')) clearHistory();
            }}
          >
            <i className="fas fa-trash" /> Limpiar
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-history" style={{ fontSize: '3rem', opacity: 0.4 }} />
          <p>No has leído ningún capítulo aún.</p>
        </div>
      ) : (
        <ul className="history-list">
          {items.map(({ entry, manga }) => (
            <li key={`${entry.mangaId}-${entry.chapter}`} className="history-item">
              {manga && (
                <Image
                  src={manga.image}
                  alt={manga.title}
                  width={60}
                  height={80}
                  style={{ objectFit: 'cover' }}
                  loading="lazy"
                  unoptimized={manga.image.startsWith('/img/')}
                />
              )}
              <div className="history-info">
                <Link href={`/manga/${entry.mangaId}`}>
                  <strong>{entry.title}</strong>
                </Link>
                <p>Capítulo {entry.chapter}</p>
                <small>{relativeDate(entry.timestamp)}</small>
              </div>
              <Link
                href={`/chapter/${entry.mangaId}/${entry.chapter}`}
                className="btn"
              >
                Continuar
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
