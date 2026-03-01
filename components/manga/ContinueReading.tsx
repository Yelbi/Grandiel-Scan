'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useHistoryContext } from '@/components/providers/HistoryProvider';
import type { HistoryEntry, Manga } from '@/lib/types';

interface ContinueReadingProps {
  mangas: Manga[];
}

function ContinueReadingCard({ entry, manga }: { entry: HistoryEntry; manga: Manga }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="manga-card product-item">
      <Link href={`/chapter/${entry.mangaId}/${entry.chapter}`}>
        <div className="manga-card-inner">
          {imgError ? (
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
              aria-label={manga.title}
            >
              <i className="fas fa-book" aria-hidden="true" />
            </div>
          ) : (
            <Image
              src={manga.image}
              alt={manga.title}
              width={200}
              height={280}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              loading="lazy"
              unoptimized={manga.image.startsWith('/img/')}
              onError={() => setImgError(true)}
            />
          )}
        </div>
        <h3 className="manga-card__title">{manga.title}</h3>
        <div className="manga-meta">
          <span className="manga-chapters">Cap. {entry.chapter}</span>
        </div>
      </Link>
    </div>
  );
}

export default function ContinueReading({ mangas }: ContinueReadingProps) {
  const { history } = useHistoryContext();

  if (history.length === 0) return null;

  const items = history.slice(0, 6).map((entry) => ({
    entry,
    manga: mangas.find((m) => m.id === entry.mangaId),
  })).filter((item) => item.manga !== undefined);

  if (items.length === 0) return null;

  return (
    <section className="continue-reading-container index-section" aria-label="Continuar leyendo">
      <h2 className="section-title">Continuar Leyendo</h2>
      <div className="mami">
        {items.map(({ entry, manga }) => (
          <ContinueReadingCard key={entry.mangaId} entry={entry} manga={manga!} />
        ))}
      </div>
    </section>
  );
}
