'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/components/providers/UserProfileProvider';

/**
 * Página de fallback para el callback de autenticación.
 * El flujo principal pasa por /api/auth/callback (server route).
 * Esta página solo se usa si el usuario llega aquí directamente
 * y ya tiene sesión activa (e.g. desde una sesión previa).
 */
export default function AuthCallbackPage() {
  const { isLoggedIn, loading } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(isLoggedIn ? '/perfil' : '/');
    }
  }, [isLoggedIn, loading, router]);

  return (
    <div className="curva" style={{ textAlign: 'center', paddingTop: '6rem' }}>
      <i
        className="fas fa-spinner fa-spin"
        style={{ fontSize: '2.5rem', opacity: 0.6 }}
        aria-hidden="true"
      />
      <p style={{ marginTop: '1.5rem', opacity: 0.7 }}>Verificando sesión...</p>
    </div>
  );
}
