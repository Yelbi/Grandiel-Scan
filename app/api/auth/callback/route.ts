import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Supabase Auth callback.
 * Lee cookies del request (PKCE verifier) y escribe la sesión en el response.
 * Este patrón es el correcto para Route Handlers en Next.js 15.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/perfil';

  if (!code) {
    return NextResponse.redirect(`${origin}/perfil?error=auth`);
  }

  // Acumular cookies de sesión que Supabase quiere guardar
  const sessionCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          // Leer del request (incluye el PKCE code verifier)
          getAll: () => request.cookies.getAll(),
          // Guardar en nuestro acumulador (se aplican al response luego)
          setAll: (cookies) => {
            cookies.forEach((c) => sessionCookies.push(c));
          },
        },
      },
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      console.error('[auth/callback] exchangeCodeForSession failed:', error?.message ?? 'no user');
      return NextResponse.redirect(`${origin}/perfil?error=auth`);
    }

    const user = data.user;
    const username = (user.user_metadata?.username as string | undefined)?.trim();
    const avatar   = (user.user_metadata?.avatar  as string | undefined) ?? '/img/avatars/avatar1.svg';

    if (username) {
      const { error: upsertError } = await supabase
        .from('users')
        .upsert(
          { id: user.id, username, avatar },
          { onConflict: 'id', ignoreDuplicates: true },
        );
      if (upsertError) {
        console.error('[auth/callback] upsert error:', upsertError.message);
      }
    }

    // Crear redirect y aplicar las cookies de sesión al response
    const response = NextResponse.redirect(`${origin}${next}`);
    sessionCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
    });
    return response;

  } catch (err) {
    console.error('[auth/callback] Unexpected error:', String(err));
    return NextResponse.redirect(`${origin}/perfil?error=auth`);
  }
}
