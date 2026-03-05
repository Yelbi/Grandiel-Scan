'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/components/providers/UserProfileProvider';

/**
 * Página de aterrizaje del magic link (flujo implícito).
 * Con flowType:'implicit', Supabase envía el token en el hash de la URL:
 *   /auth/callback#access_token=XXX&refresh_token=YYY
 * El createBrowserClient lo detecta automáticamente en onAuthStateChange.
 * Esta página solo espera a que el UserProfileProvider establezca la sesión
 * y luego redirige al perfil.
 */
export default function AuthCallbackPage() {
  const { isLoggedIn, loading } = useUserProfile();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  // Redirigir en cuanto la sesión esté lista
  useEffect(() => {
    if (!loading && isLoggedIn) {
      router.replace('/perfil');
    }
  }, [isLoggedIn, loading, router]);

  // Timeout de 20 s por si el token es inválido o expiró
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 20_000);
    return () => clearTimeout(t);
  }, []);

  if (timedOut && !isLoggedIn) {
    return (
      <div className="curva" style={{ textAlign: 'center', paddingTop: '6rem' }}>
        <i
          className="fas fa-exclamation-circle"
          style={{ fontSize: '2.5rem', color: 'var(--color-primary)' }}
          aria-hidden="true"
        />
        <h2 style={{ marginTop: '1rem' }}>El enlace expiró o ya fue usado</h2>
        <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>
          Regresa a la página de perfil e intenta registrarte de nuevo.
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

  return (
    <div className="curva" style={{ textAlign: 'center', paddingTop: '6rem' }}>
      <i
        className="fas fa-spinner fa-spin"
        style={{ fontSize: '2.5rem', opacity: 0.6 }}
        aria-hidden="true"
      />
      <p style={{ marginTop: '1.5rem', opacity: 0.7 }}>Activando tu cuenta...</p>
    </div>
  );
}
