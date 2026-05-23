import Image from 'next/image';
import Link from 'next/link';
import type { Manga } from '@/lib/types';
import HeroWordCycle from './HeroWordCycle';

// Posiciones estáticas de las portadas flotantes.
// l = left%, r = rotación°, dur = duración s, d = delay s (negativo = ya avanzado en su ciclo)
const SCATTER = [
  { l: '1%',  r: -8,  dur: 22, d: -5  },
  { l: '7%',  r: 11,  dur: 26, d: -2  },
  { l: '13%', r: 5,   dur: 28, d: -14 },
  { l: '18%', r: -15, dur: 24, d: -6  },
  { l: '24%', r: -12, dur: 20, d: -8  },
  { l: '30%', r: 7,   dur: 25, d: -20 },
  { l: '35%', r: -10, dur: 27, d: -22 },
  { l: '40%', r: -4,  dur: 30, d: -3  },
  { l: '45%', r: 4,   dur: 29, d: -9  },
  { l: '50%', r: 10,  dur: 23, d: -11 },
  { l: '55%', r: 8,   dur: 20, d: -4  },
  { l: '60%', r: -6,  dur: 27, d: -18 },
  { l: '65%', r: -14, dur: 22, d: -19 },
  { l: '70%', r: 9,   dur: 19, d: -7  },
  { l: '75%', r: -5,  dur: 33, d: -15 },
  { l: '80%', r: -3,  dur: 31, d: -24 },
  { l: '85%', r: -7,  dur: 25, d: -6  },
  { l: '90%', r: 6,   dur: 24, d: -16 },
  { l: '95%', r: 13,  dur: 21, d: -10 },
  { l: '4%',  r: -3,  dur: 29, d: -17 },
  { l: '10%', r: 3,   dur: 23, d: -12 },
  { l: '21%', r: -9,  dur: 21, d: -13 },
  { l: '33%', r: -11, dur: 26, d: -21 },
  { l: '43%', r: 2,   dur: 22, d: -11 },
  { l: '52%', r: 6,   dur: 32, d: -1  },
  { l: '63%', r: -4,  dur: 28, d: -3  },
  { l: '72%', r: -8,  dur: 18, d: -23 },
  { l: '78%', r: 10,  dur: 19, d: -25 },
  { l: '88%', r: 12,  dur: 25, d: -8  },
  { l: '97%', r: -12, dur: 30, d: -20 },
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
                  style={{ transform: `rotate(${pos.r}deg)` }}
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
          {' '}en español
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
