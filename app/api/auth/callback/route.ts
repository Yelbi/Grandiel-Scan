import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Supabase Auth callback.
 * Maneja el intercambio del code PKCE por una sesión y crea el perfil de usuario.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/perfil';

  const redirectError = () =>
    NextResponse.redirect(`${origin}/perfil?error=auth`);

  if (!code) return redirectError();

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      console.error('[auth/callback] exchangeCodeForSession error:', error?.message);
      return redirectError();
    }

    const user = data.user;
    const meta = user.user_metadata ?? {};
    const username = (meta.username as string | undefined)?.trim();
    const avatar = (meta.avatar as string | undefined) ?? '/img/avatars/avatar1.svg';

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

    return NextResponse.redirect(`${origin}${next}`);
  } catch (err) {
    console.error('[auth/callback] Unexpected error:', err);
    return redirectError();
  }
}
