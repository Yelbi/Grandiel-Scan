'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useHistoryContext } from '@/components/providers/HistoryProvider';
import type { Manga } from '@/lib/types';

interface ContinueReadingProps {
  mangas: Manga[];
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
      <div className="manga-grid">
        {items.map(({ entry, manga }) => (
          <div key={entry.mangaId} className="manga-card">
            <Link href={`/chapter/${entry.mangaId}/${entry.chapter}`}>
              <Image
                src={manga!.image}
                alt={manga!.title}
                width={200}
                height={280}
                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                loading="lazy"
                unoptimized={manga!.image.startsWith('/img/')}
              />
              <div className="manga-card-info">
                <h3 className="manga-card-title">{manga!.title}</h3>
                <p className="manga-card-chapters">Cap. {entry.chapter}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
