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
    <div className="reader-error-page">
      <i className="fas fa-file-times reader-error-icon" aria-hidden="true" />
      <h2 className="reader-error-title">Error al cargar el capítulo</h2>
      <p className="reader-error-desc">
        No se pudieron cargar las páginas de este capítulo.
      </p>
      <div className="reader-error-actions">
        <button className="btn" onClick={reset}>
          <i className="fas fa-redo" aria-hidden="true" /> Reintentar
        </button>
        <button className="btn" onClick={() => window.location.reload()}>
          <i className="fas fa-sync-alt" aria-hidden="true" /> Recargar página
        </button>
        <Link href="/mangas" className="btn">
          <i className="fas fa-images" aria-hidden="true" /> Ver galería
        </Link>
      </div>
    </div>
  );
}
