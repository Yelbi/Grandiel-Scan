'use client';

import { useRef } from 'react';
import MangaCard from './MangaCard';
import type { Manga } from '@/lib/types';

interface MangaSliderProps {
  mangas: Manga[];
}

export default function MangaSlider({ mangas }: MangaSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    trackRef.current?.scrollBy({
      left: dir === 'left' ? -640 : 640,
      behavior: 'smooth',
    });
  };

  return (
    <div className="manga-slider">
      <button
        className="manga-slider__btn manga-slider__btn--prev"
        onClick={() => scroll('left')}
        aria-label="Desplazar izquierda"
      >
        <i className="fas fa-chevron-left" aria-hidden="true" />
      </button>

      <div className="manga-slider__track" ref={trackRef}>
        {mangas.map((manga) => (
          <div className="manga-slider__item" key={manga.id}>
            <MangaCard manga={manga} />
          </div>
        ))}
      </div>

      <button
        className="manga-slider__btn manga-slider__btn--next"
        onClick={() => scroll('right')}
        aria-label="Desplazar derecha"
      >
        <i className="fas fa-chevron-right" aria-hidden="true" />
      </button>
    </div>
  );
}
