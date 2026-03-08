'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useHistoryContext } from '@/components/providers/HistoryProvider';
import type { HistoryEntry } from '@/lib/types';

function ContinueReadingCard({ entry }: { entry: HistoryEntry }) {
  const [imgError, setImgError] = useState(false);
  const image = entry.image;

  return (
    <div className="manga-card product-item">
      <Link href={`/chapter/${entry.mangaId}/${entry.chapter}`}>
        <div className="manga-card-inner">
          {!image || imgError ? (
            <div
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
              aria-label={entry.title}
            >
              <i className="fas fa-book" aria-hidden="true" />
            </div>
          ) : (
            <Image
              src={image}
              alt={entry.title}
              width={200}
              height={280}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              loading="lazy"
              unoptimized={image.startsWith('/img/')}
              onError={() => setImgError(true)}
            />
          )}

          {/* Progress bar overlay */}
          {entry.page !== undefined && entry.page > 0 && (
            <div
              className="manga-card__progress"
              aria-label={`Página ${entry.page}`}
              aria-hidden="true"
            >
              <div
                className="manga-card__progress-fill"
                style={{ width: `${Math.min(entry.page * 5, 100)}%` }}
              />
            </div>
          )}
        </div>
        <h3 className="manga-card__title">{entry.title}</h3>
        <div className="manga-meta">
          <span className="manga-chapters">Cap. {entry.chapter}</span>
        </div>
      </Link>
    </div>
  );
}

export default function ContinueReading() {
  const { history } = useHistoryContext();

  if (history.length === 0) return null;

  const items = history.slice(0, 6);

  if (items.length === 0) return null;

  return (
    <section className="continue-reading-container index-section" aria-label="Continuar leyendo">
      <h2 className="section-title">Continuar Leyendo</h2>
      <div className="mami">
        {items.map((entry) => (
          <ContinueReadingCard key={entry.mangaId} entry={entry} />
        ))}
      </div>
    </section>
  );
}
