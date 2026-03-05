import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Supabase Auth callback.
 * Supabase redirige aquí tras confirmar un email o completar OAuth.
 * 1. Intercambia el `code` por una sesión de usuario.
 * 2. Crea la fila en public.users si no existe (por si el trigger SQL no está configurado).
 * 3. Redirige al perfil.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/perfil';

  if (code) {
    const supabase = await createClient();
    const { data: exchangeData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && exchangeData.user) {
      const user = exchangeData.user;
      const meta = user.user_metadata ?? {};

      // Crear fila en public.users si no existe todavía.
      // Esto es necesario cuando el trigger SQL de Supabase no está configurado.
      const username = (meta.username as string | undefined)?.trim();
      const avatar   = (meta.avatar  as string | undefined) ?? '/img/avatars/avatar1.svg';

      if (username) {
        await supabase
          .from('users')
          .upsert(
            { id: user.id, username, avatar },
            { onConflict: 'id', ignoreDuplicates: true },
          );
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Si algo falla, redirigir al perfil con indicador de error
  return NextResponse.redirect(`${origin}/perfil?error=auth`);
}
