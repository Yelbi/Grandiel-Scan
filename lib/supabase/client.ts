import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Flujo implícito: el token llega en el hash de la URL (#access_token=...)
        // Evita el PKCE y el code_verifier que requiere cookies cruzadas.
        flowType: 'implicit',
      },
    },
  );
}
