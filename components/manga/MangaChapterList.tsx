'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useHistoryContext } from '@/components/providers/HistoryProvider';
import type { Manga } from '@/lib/types';

export default function MangaChapterList({ manga }: { manga: Manga }) {
  const { getLastRead } = useHistoryContext();
  const lastReadChapter = getLastRead(manga.id)?.chapter ?? null;

  const chaptersDesc = useMemo(
    () => [...manga.chapters].reverse(),
    [manga.chapters],
  );

  return (
    <section className="capitulos" aria-label="Lista de capítulos">
      {chaptersDesc.map((cap) => {
        const isLastRead = lastReadChapter !== null && cap === lastReadChapter;
        return (
          <div key={cap} className={`cap${isLastRead ? ' cap--last-read' : ''}`}>
            <Link
              href={`/chapter/${manga.id}/${cap}`}
              aria-label={`Capítulo ${cap}${isLastRead ? ' — último leído' : ''}`}
            >
              Capítulo {cap}
              {isLastRead && <span className="chapter-badge">Último leído</span>}
            </Link>
          </div>
        );
      })}
    </section>
  );
}
