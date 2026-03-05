'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/components/providers/UserProfileProvider';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const { isLoggedIn, loading } = useUserProfile();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const [exchangeError, setExchangeError] = useState(false);

  // Intercambiar el código PKCE explícitamente (createBrowserClient no lo hace automáticamente)
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      setTimedOut(true);
      return;
    }
    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        console.error('[auth/callback] exchangeCodeForSession error:', error.message);
        setExchangeError(true);
      }
      // Si tiene éxito, onAuthStateChange en Providers disparará y pondrá isLoggedIn = true
    });
  }, []);

  // Si tras 12 segundos no hay sesión, mostramos error
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 12000);
    return () => clearTimeout(t);
  }, []);

  // En cuanto el perfil esté listo, ir al perfil
  useEffect(() => {
    if (!loading && isLoggedIn) {
      router.replace('/perfil');
    }
  }, [isLoggedIn, loading, router]);

  if ((timedOut || exchangeError) && !isLoggedIn) {
    return (
      <div className="curva" style={{ textAlign: 'center', paddingTop: '6rem' }}>
        <i className="fas fa-exclamation-circle" style={{ fontSize: '2.5rem', color: 'var(--color-primary)' }} />
        <h2 style={{ marginTop: '1rem' }}>El enlace expiró o ya fue usado</h2>
        <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>
          Regresa a la página de perfil e intenta registrarte de nuevo.
        </p>
        <a href="/perfil" className="btn-primary" style={{ display: 'inline-block', marginTop: '1.5rem' }}>
          Ir al perfil
        </a>
      </div>
    );
  }

  return (
    <div className="curva" style={{ textAlign: 'center', paddingTop: '6rem' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '2.5rem', opacity: 0.6 }} aria-hidden="true" />
      <p style={{ marginTop: '1.5rem', opacity: 0.7 }}>Activando tu cuenta...</p>
    </div>
  );
}
