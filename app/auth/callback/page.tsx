'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="curva" style={{ textAlign: 'center', paddingTop: '6rem' }}>
      <i
        className="fas fa-exclamation-circle"
        style={{ fontSize: '2.5rem', color: 'var(--color-primary)' }}
        aria-hidden="true"
      />
      <h2 style={{ marginTop: '1rem' }}>
        {error === 'missing_code' ? 'Enlace inválido' : 'El enlace expiró o ya fue usado'}
      </h2>
      <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>
        {error
          ? `Error: ${error}`
          : 'Regresa a la página de perfil e intenta registrarte de nuevo.'}
      </p>
      <a
        href="/perfil"
        className="btn-primary"
        style={{ display: 'inline-block', marginTop: '1.5rem' }}
      >
        Ir al perfil
      </a>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackContent />
    </Suspense>
  );
}
