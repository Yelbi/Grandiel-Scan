'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Última red de seguridad: captura errores lanzados en el propio RootLayout,
 * donde `app/error.tsx` ya no puede renderizar. Reemplaza el documento completo,
 * así que debe traer sus propias etiquetas <html> y <body>.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111',
          color: '#eee',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Algo salió mal
          </h1>
          <p style={{ color: '#aaa', marginBottom: '2rem' }}>
            La página no se pudo cargar. Ya recibimos el aviso del error.
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              background: '#ff0000',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Ir al inicio
          </a>
        </div>
      </body>
    </html>
  );
}
