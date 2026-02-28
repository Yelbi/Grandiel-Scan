import type { Metadata } from 'next';
import MangaCard from '@/components/manga/MangaCard';
import { getAllMangas } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Nuevos Mangas',
  description: 'Los manhwas y mangas más recientes añadidos al catálogo de Grandiel Scan.',
};

const DAYS_TO_BE_NEW = 30;

export default async function NuevosPage() {
  const mangas = await getAllMangas();
  const sorted = [...mangas].sort((a, b) =>
    b.dateAdded.localeCompare(a.dateAdded),
  );

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS_TO_BE_NEW);

  return (
    <div className="page-container">
      <h1 className="page-title">
        <i className="fas fa-star" /> Nuevos Mangas
      </h1>

      <div className="manga-grid">
        {sorted.map((manga) => {
          const isNew = new Date(manga.dateAdded) >= cutoff;
          return (
            <div key={manga.id} style={{ position: 'relative' }}>
              {isNew && (
                <span
                  className="badge badge-new"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    zIndex: 10,
                    background: 'var(--color-primary)',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  NUEVO
                </span>
              )}
              <MangaCard manga={manga} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
