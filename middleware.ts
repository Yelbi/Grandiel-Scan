import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  // response es mutable: Supabase puede añadir/renovar cookies de sesión
  let response = NextResponse.next({ request: req });

  // ── Refrescar sesión de Supabase en cada request ────────────────────────────
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
            response = NextResponse.next({ request: req });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );
    // IMPORTANTE: no usar getSession() aquí — getUser() valida el token en el servidor
    await supabase.auth.getUser();
  } catch {
    // Si Supabase falla (red, token inválido, etc.), continuar sin crashear
  }

  // ── Proteger rutas de admin con Basic Auth ──────────────────────────────────
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin')
  ) {
    const authHeader = req.headers.get('authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (authHeader?.startsWith('Basic ')) {
      try {
        const decoded = atob(authHeader.slice(6));
        const colonIdx = decoded.indexOf(':');
        const password = colonIdx !== -1 ? decoded.slice(colonIdx + 1) : decoded;

        if (password === adminPassword) {
          return response; // devolver response con las cookies de sesión
        }
      } catch {
        // Base64 inválido — caer al 401
      }
    }

    return new NextResponse('Acceso denegado', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Grandiel Scan"' },
    });
  }

  return response;
}

export const config = {
  matcher: [
    // Ejecutar en todas las rutas excepto archivos estáticos y assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
