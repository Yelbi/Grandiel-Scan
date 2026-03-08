import Link from 'next/link';
import Image from 'next/image';
import type { Manga } from '@/lib/types';

interface Props {
  mangas: Manga[]; // 1-3 mangas ordenados por vistas desc
}

function formatViews(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString('es-ES');
}

const LABELS = { 1: '1°', 2: '2°', 3: '3°' } as const;

export default function MostViewedPodium({ mangas }: Props) {
  if (mangas.length === 0) return null;

  const [first, second, third] = mangas;

  // Orden visual según cuántos mangas haya:
  // 3: bronce(izq) → oro(centro) → plata(der)
  // 2: plata(izq) → oro(centro)
  // 1: solo oro(centro)
  const slots =
    mangas.length >= 3
      ? [
          { manga: third,  rank: 3 as const },
          { manga: first,  rank: 1 as const },
          { manga: second, rank: 2 as const },
        ]
      : mangas.length === 2
        ? [
            { manga: second, rank: 2 as const },
            { manga: first,  rank: 1 as const },
          ]
        : [{ manga: first, rank: 1 as const }];

  return (
    <section className="index-section podium-section" aria-label="Mangas más vistos">
      <h2 className="section-title">
        <i className="fas fa-trophy" aria-hidden="true" /> Más Vistos
      </h2>

      <div className="podium" role="list">
        {slots.map(({ manga, rank }) => (
          <div
            key={manga.id}
            className={`podium__item podium__item--rank${rank}`}
            role="listitem"
            aria-label={`${LABELS[rank]} lugar: ${manga.title}`}
          >
            {/* Tarjeta flotante sobre el podio */}
            <Link href={`/manga/${manga.id}`} className="podium__card">

              {/* Solo #1 muestra corona */}
              <div className="podium__icon-slot">
                {rank === 1 && (
                  <i className="fas fa-crown podium__crown" aria-hidden="true" />
                )}
              </div>

              <div className="podium__cover">
                <Image
                  src={manga.image}
                  alt={manga.title}
                  fill
                  sizes="(max-width: 600px) 33vw, 210px"
                  style={{ objectFit: 'cover' }}
                  unoptimized={manga.image.startsWith('/img/')}
                />
                <div className="podium__cover-overlay" aria-hidden="true" />
              </div>

              <div className="podium__info">
                <p className="podium__title">{manga.title}</p>
                {manga.views !== undefined && (
                  <p className="podium__views">
                    <i className="fas fa-eye" aria-hidden="true" />{' '}
                    {formatViews(manga.views)}
                  </p>
                )}
              </div>
            </Link>

            {/* Botón "Leer ahora" → último capítulo */}
            {manga.latestChapter > 0 && (
              <Link
                href={`/chapter/${manga.id}/${manga.latestChapter}`}
                className="podium__read-btn"
                aria-label={`Leer capítulo ${manga.latestChapter} de ${manga.title}`}
              >
                <i className="fas fa-book-open" aria-hidden="true" /> Leer ahora
              </Link>
            )}

            {/* Base del podio */}
            <div className="podium__base" aria-hidden="true">
              <span className="podium__place">{LABELS[rank]}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
