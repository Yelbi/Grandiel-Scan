'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import Link from 'next/link';

// Límite de error de las rutas bajo app/. El fallo del propio RootLayout lo cubre
// app/global-error.tsx, que es un componente distinto.
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Reportar a Sentry además de la consola: los errores de cliente en producción
    // no se ven en ningún sitio si solo se hace console.error.
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <div className="curva" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', color: 'var(--color-primary, #ff0000)', marginBottom: '1rem', display: 'block' }} aria-hidden="true" />
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Algo salió mal</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
        Ocurrió un error inesperado. Por favor intenta de nuevo.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={reset}>
          <i className="fas fa-redo" aria-hidden="true" /> Intentar de nuevo
        </button>
        <button className="btn" onClick={() => window.location.reload()}>
          <i className="fas fa-sync-alt" aria-hidden="true" /> Recargar página
        </button>
        <Link href="/" className="btn">
          <i className="fas fa-home" aria-hidden="true" /> Ir al inicio
        </Link>
      </div>
    </div>
  );
}
