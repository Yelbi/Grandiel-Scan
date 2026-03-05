import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Intercambia el código PKCE de Supabase por una sesión en el servidor.
 * Las cookies de sesión se setean directamente en el NextResponse.redirect
 * para garantizar que lleguen al navegador.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get('code');
  const next  = searchParams.get('next') ?? '/perfil';
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${origin}/auth/callback?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/callback?error=missing_code`);
  }

  // Crear la respuesta redirect de antemano para poder setear cookies en ella
  const successUrl = new URL(next, origin);
  const response   = NextResponse.redirect(successUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Setear en request (para el cliente Supabase) Y en la respuesta (para el navegador)
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
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

  return response;
}
