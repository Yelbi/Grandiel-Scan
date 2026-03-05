import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Intercambia el código PKCE de Supabase por una sesión en el servidor.
 * El Route Handler tiene acceso a las cookies (incluyendo code_verifier),
 * por lo que el intercambio es confiable independientemente del navegador.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get('code');
  const next  = searchParams.get('next') ?? '/perfil';
  const error = searchParams.get('error');

  // Redirigir errores que Supabase nos envía directamente
  if (error) {
    return NextResponse.redirect(`${origin}/auth/callback?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/callback?error=missing_code`);
  }

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      },
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[auth/callback] exchange error:', exchangeError.message);
      return NextResponse.redirect(
        `${origin}/auth/callback?error=${encodeURIComponent(exchangeError.message)}`,
      );
    }

    // Intercambio exitoso → ir al perfil (o a la ruta solicitada)
    return NextResponse.redirect(`${origin}${next}`);
  } catch (err) {
    console.error('[auth/callback] unexpected error:', err);
    return NextResponse.redirect(`${origin}/auth/callback?error=unexpected`);
  }
}
