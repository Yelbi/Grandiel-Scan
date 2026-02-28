'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { Manga } from '@/lib/types';

const WORDS = ['manhwas', 'mangas', 'manhuas'] as const;
const INTERVAL_MS  = 3000;
const GLITCH_OUT_MS = 450;
const GLITCH_IN_MS  = 450;

type Phase = 'idle' | 'out' | 'in';

export default function HeroSection({
  heroCovers,
}: {
  heroCovers: Pick<Manga, 'id' | 'image'>[];
}) {
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    const timer = setInterval(() => {
      // Fase 1: glitch de salida
      setPhase('out');

      setTimeout(() => {
        // Fase 2: cambia la palabra + glitch de entrada
        setWordIndex((i) => (i + 1) % WORDS.length);
        setPhase('in');

        setTimeout(() => {
          // Fase 3: estado limpio
          setPhase('idle');
        }, GLITCH_IN_MS);
      }, GLITCH_OUT_MS);
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  const accentClass = [
    'hero__accent',
    'hero__accent--cycle',
    phase === 'out' ? 'hero__accent--glitch-out' : '',
    phase === 'in'  ? 'hero__accent--glitch-in'  : '',
  ].filter(Boolean).join(' ');

  return (
    <section className="hero" aria-label="Bienvenida a Grandiel Scan">
      <div className="hero__bg-glow" />

      {/* Portadas flotantes decorativas */}
      <div className="hero__covers" aria-hidden="true">
        {heroCovers.map((manga, i) => (
          <div key={manga.id} className={`hero__cover hero__cover--${i + 1}`}>
            <Image
              src={manga.image}
              alt=""
              width={140}
              height={200}
              unoptimized={manga.image.startsWith('/img/')}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            />
          </div>
        ))}
      </div>

      <div className="hero__content">
        <p className="hero__eyebrow">Grandiel Scan</p>
        <h1 className="hero__title">
          Lee los mejores{' '}
          <span className={accentClass} aria-live="polite">
            {WORDS[wordIndex]}
          </span>
          {' '}en español
        </h1>
        <p className="hero__subtitle">
          Catálogo actualizado con los títulos más populares. Crea tu cuenta
          gratis, guarda favoritos y retoma donde lo dejaste.
        </p>
        <div className="hero__actions">
          <Link href="/mangas" className="hero__btn-primary">
            <i className="fas fa-images" aria-hidden="true" /> Explorar Catálogo
          </Link>
          <Link href="/perfil" className="hero__btn-secondary">
            <i className="fas fa-user-plus" aria-hidden="true" /> Crear Cuenta
          </Link>
        </div>
      </div>
    </section>
  );
}
