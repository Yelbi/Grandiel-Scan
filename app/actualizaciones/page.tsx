import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getAllMangas } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Actualizaciones',
  description: 'Últimas actualizaciones de capítulos en Grandiel Scan.',
};

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} semana${Math.floor(days / 7) !== 1 ? 's' : ''}`;
  return new Date(dateStr).toLocaleDateString('es-ES');
}

export default async function ActualizacionesPage() {
  const mangas = await getAllMangas();
  const sorted = [...mangas].sort((a, b) =>
    b.lastUpdated.localeCompare(a.lastUpdated),
  );

  return (
    <div className="page-container">
      <h1 className="page-title">
        <i className="fas fa-bell" /> Actualizaciones
      </h1>

      <div className="updates-list">
        {sorted.map((manga) => (
          <div key={manga.id} className="update-item">
            <Link href={`/manga/${manga.id}`} className="update-cover">
              <Image
                src={manga.image}
                alt={manga.title}
                width={60}
                height={80}
                style={{ objectFit: 'cover' }}
                loading="lazy"
                unoptimized={manga.image.startsWith('/img/')}
              />
            </Link>
            <div className="update-info">
              <Link href={`/manga/${manga.id}`}>
                <strong>{manga.title}</strong>
              </Link>
              <p className="update-chapter">
                Último capítulo:{' '}
                <Link href={`/chapter/${manga.id}/${manga.latestChapter}`}>
                  Cap. {manga.latestChapter}
                </Link>
              </p>
              <small className="update-date">
                {relativeDate(manga.lastUpdated)}
              </small>
            </div>
            <Link
              href={`/chapter/${manga.id}/${manga.latestChapter}`}
              className="btn update-read-btn"
            >
              Leer
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
