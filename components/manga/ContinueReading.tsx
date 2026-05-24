'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useHistoryContext } from '@/components/providers/HistoryProvider';
import { shouldOptimize } from '@/lib/image';
import type { HistoryEntry } from '@/lib/types';

interface ContinueReadingProps {
  mangaImages?: Record<string, string>;
}

function ContinueReadingCard({
  entry,
  mangaImages,
}: {
  entry: HistoryEntry;
  mangaImages?: Record<string, string>;
}) {
  const [imgError, setImgError] = useState(false);
  const image = entry.image ?? mangaImages?.[entry.mangaId];

  const progressPct =
    entry.page !== undefined && entry.page > 0 && entry.totalPages && entry.totalPages > 0
      ? Math.min(Math.round((entry.page / entry.totalPages) * 100), 100)
      : null;

  return (
    <li className="manga-card product-item">
      <Link
        href={`/chapter/${entry.mangaId}/${entry.chapter}`}
        aria-label={`Continuar leyendo ${entry.title}, capítulo ${entry.chapter}`}
      >
        <div className="manga-card-inner">
          {!image || imgError ? (
            <div
              role="img"
              aria-label={entry.title}
              style={{
                width: '100%',
                height: '100%',
                minHeight: '280px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-bg-secondary, #1a1a1a)',
                color: 'var(--color-text-secondary, #b0b0b0)',
                fontSize: '2rem',
              }}
            >
              <i className="fas fa-book" aria-hidden="true" />
            </div>
          ) : (
            <Image
              src={image}
              alt={entry.title}
              width={200}
              height={280}
              sizes="(max-width: 480px) 140px, 200px"
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              loading="lazy"
              unoptimized={!shouldOptimize(image)}
              onError={() => setImgError(true)}
            />
          )}

          {progressPct !== null && (
            <div className="manga-card__progress" aria-hidden="true">
              <div
                className="manga-card__progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>
        <h3 className="manga-card__title">{entry.title}</h3>
        <div className="manga-meta">
          <span className="manga-chapters">Cap. {entry.chapter}</span>
          {entry.page !== undefined && entry.page > 0 && (
            <span className="manga-chapters">Pág. {entry.page + 1}</span>
          )}
        </div>
      </Link>
    </li>
  );
}

export default function ContinueReading({ mangaImages }: ContinueReadingProps) {
  const { history } = useHistoryContext();
  // UX-4: esperar a que el cliente hidrate antes de renderizar para evitar CLS.
  // En SSR el historial siempre está vacío, por lo que sin este flag el contenido
  // aparecería y desaparecería bruscamente al hidratar.
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || history.length === 0) return null;

  const items = history.slice(0, 6);

  return (
    <section className="continue-reading-container index-section" aria-label="Continuar leyendo">
      <h2 className="section-title">Continuar Leyendo</h2>
      {/* A-4: <ul>/<li> para semántica de lista correcta */}
      <ul className="manga-grid" role="list">
        {items.map((entry) => (
          <ContinueReadingCard key={entry.mangaId} entry={entry} mangaImages={mangaImages} />
        ))}
      </ul>
    </section>
  );
}
