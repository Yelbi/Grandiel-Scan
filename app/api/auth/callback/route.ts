import { type NextRequest, NextResponse } from 'next/server';

/**
 * Fallback por si Supabase redirige con ?code= en lugar de #access_token=
 * Con flowType:'implicit' esto no debería ocurrir, pero lo mantenemos
 * como seguridad redirigiendo a la página cliente.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/callback?error=${encodeURIComponent(error)}`,
    );
  }

  if (code) {
    // Reenviar a la página cliente que maneja el intercambio
    return NextResponse.redirect(`${origin}/auth/callback?code=${code}`);
  }

  return NextResponse.redirect(`${origin}/auth/callback`);
}
