import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

/** Elimina cookies de Supabase acumuladas que superan el límite de headers (494) */
function purgeStaleSbCookies(req: NextRequest, response: NextResponse) {
  const sbCookies = req.cookies.getAll().filter((c) => c.name.startsWith('sb-'));

  // Agrupar por nombre base (sin el sufijo ".0", ".1", etc.)
  const seen = new Set<string>();
  for (const cookie of sbCookies) {
    const base = cookie.name.replace(/\.\d+$/, '');
    if (seen.has(base)) {
      // Cookie duplicada/obsoleta — eliminar del response
      response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' });
    } else {
      seen.add(base);
    }
  }
}

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

  // Limpiar cookies sb-* duplicadas para evitar el error 494 REQUEST_HEADER_TOO_LARGE
  purgeStaleSbCookies(req, response);

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
