'use client';

import { useEffect, useState } from 'react';

interface PageLoaderProps {
  /** ms tras los cuales se considera que la carga es anormalmente lenta y se ofrece recargar. */
  slowAfterMs?: number;
  /** Texto debajo del spinner. */
  label?: string;
}

/**
 * Spinner a pantalla completa usado como fallback de Suspense en `loading.tsx`.
 * Si la carga supera `slowAfterMs`, aparece un botón para recargar la página.
 * NO se usa en /chapter porque allí las páginas se cargan incrementalmente con
 * sus propios placeholders por imagen.
 */
export default function PageLoader({ slowAfterMs = 8000, label = 'Cargando…' }: PageLoaderProps) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), slowAfterMs);
    return () => clearTimeout(t);
  }, [slowAfterMs]);

  return (
    <div className="page-loader" role="status" aria-live="polite">
      <div className="page-loader__spinner" aria-hidden="true" />
      <p className="page-loader__text">
        {slow ? 'Esto está tardando más de lo esperado…' : label}
      </p>
      {slow && (
        <button
          type="button"
          className="page-loader__reload"
          onClick={() => window.location.reload()}
        >
          <i className="fas fa-redo" aria-hidden="true" /> Recargar página
        </button>
      )}
      <span className="visually-hidden">Cargando contenido</span>
    </div>
  );
}
