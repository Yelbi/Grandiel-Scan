import { type NextRequest, NextResponse } from 'next/server';

/**
 * Redirige el callback de Supabase a la página cliente /auth/callback.
 * El intercambio PKCE se hace en el navegador (exchangeCodeForSession)
 * para evitar FUNCTION_INVOCATION_FAILED en Vercel Hobby.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/perfil?error=auth`);
  }

  return NextResponse.redirect(`${origin}/auth/callback?code=${encodeURIComponent(code)}`);
}
