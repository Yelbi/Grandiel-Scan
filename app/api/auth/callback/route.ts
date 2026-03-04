import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Supabase Auth callback.
 * Supabase redirige aquí tras confirmar un email o completar OAuth.
 * Intercambia el `code` por una sesión de usuario y redirige al perfil.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get('code');
  const next  = searchParams.get('next') ?? '/perfil';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Si algo falla, redirigir al perfil con un indicador de error
  return NextResponse.redirect(`${origin}/perfil?error=auth`);
}
