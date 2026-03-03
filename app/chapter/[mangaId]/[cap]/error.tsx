'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ChapterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="curva" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <i className="fas fa-file-times" style={{ fontSize: '3rem', color: 'var(--color-primary, #ff0000)', marginBottom: '1rem', display: 'block' }} aria-hidden="true" />
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Error al cargar el capítulo</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
        No se pudieron cargar las páginas de este capítulo.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={reset}>
          <i className="fas fa-redo" aria-hidden="true" /> Reintentar
        </button>
        <Link href="/mangas" className="btn">
          <i className="fas fa-images" aria-hidden="true" /> Ver galería
        </Link>
      </div>
    </div>
  );
}
