import Image from 'next/image';
import Link from 'next/link';
import type { Manga } from '@/lib/types';
import HeroWordCycle from './HeroWordCycle';

// Posiciones estáticas de las portadas decorativas.
// l = left%, r = rotación° fija
const SCATTER = [
  { l: '1%',  r: -8  },
  { l: '7%',  r: 11  },
  { l: '13%', r: 5   },
  { l: '18%', r: -15 },
  { l: '24%', r: -12 },
  { l: '30%', r: 7   },
  { l: '35%', r: -10 },
  { l: '40%', r: -4  },
  { l: '45%', r: 4   },
  { l: '50%', r: 10  },
  { l: '55%', r: 8   },
  { l: '60%', r: -6  },
  { l: '65%', r: -14 },
  { l: '70%', r: 9   },
  { l: '75%', r: -5  },
  { l: '80%', r: -3  },
  { l: '85%', r: -7  },
  { l: '90%', r: 6   },
  { l: '95%', r: 13  },
  { l: '4%',  r: -3  },
  { l: '10%', r: 3   },
  { l: '21%', r: -9  },
  { l: '33%', r: -11 },
  { l: '43%', r: 2   },
  { l: '52%', r: 6   },
  { l: '63%', r: -4  },
  { l: '72%', r: -8  },
  { l: '78%', r: 10  },
  { l: '88%', r: 12  },
  { l: '97%', r: -12 },
] as const;

export default function HeroSection({
  heroCovers,
}: {
  heroCovers: Pick<Manga, 'id' | 'image'>[];
}) {
  return (
    <section className="hero" aria-label="Bienvenida a Grandiel Scan">
      <div className="hero__bg-glow" />

      {/* Portadas dispersas — renderizadas en servidor, decorativas.
          F-2: solo se renderizan si hay portadas disponibles. */}
      {heroCovers.length > 0 && (
        <div className="hero__scatter" aria-hidden="true">
          {SCATTER.map((pos, i) => {
            const manga = heroCovers[i % heroCovers.length];
            return (
              <div key={i} className="hero__float">
                <div
                  className="hero__float-cover"
                  style={{ '--base-rot': `${pos.r}deg` } as React.CSSProperties}
                >
                  <Image
                    src={manga.image}
                    alt=""
                    width={72}
                    height={104}
                    loading="eager"
                    unoptimized={manga.image.startsWith('http')}
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="hero__content">
        <p className="hero__eyebrow">Grandiel Scan</p>
        <h1 className="hero__title">
          Lee los mejores{' '}
          {/* Único fragmento cliente: la palabra rotatoria */}
          <HeroWordCycle />
        </h1>
        <p className="hero__subtitle">
          Aquí podrás leer tus mangas, manhuas y manhwas favoritos de forma rápida y cómoda
          desde cualquier dispositivo. Descubre nuevos títulos y disfruta la mejor experiencia
          de lectura en un solo lugar.
        </p>
        <div className="hero__actions">
          <Link href="/mangas" className="hero__btn-primary">
            Explorar Catálogo
          </Link>
          <Link href="/actualizaciones" className="hero__btn-secondary">
            Ver Novedades
          </Link>
        </div>
      </div>
    </section>
  );
}
