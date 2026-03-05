import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

/** Elimina cookies de Supabase acumuladas que superan el límite de headers (494) */
function purgeStaleSbCookies(req: NextRequest, response: NextResponse) {
  const sbCookies = req.cookies.getAll().filter((c) => c.name.startsWith('sb-'));

  const groups = new Map<string, { baseCookies: string[]; chunkCookies: string[] }>();
  for (const cookie of sbCookies) {
    const match = cookie.name.match(/^(.*)\.(\d+)$/);
    const base  = match ? match[1] : cookie.name;
    const group = groups.get(base) ?? { baseCookies: [], chunkCookies: [] };
    if (match) {
      group.chunkCookies.push(cookie.name);
    } else {
      group.baseCookies.push(cookie.name);
    }
    groups.set(base, group);
  }

  // Si existe versión chunked (.0/.1/...) para una cookie base, eliminar solo la base plana.
  // Nunca se eliminan chunks válidos para evitar cortar sesiones activas.
  for (const group of groups.values()) {
    if (group.chunkCookies.length > 0 && group.baseCookies.length > 0) {
      for (const staleName of group.baseCookies) {
        response.cookies.set(staleName, '', { maxAge: 0, path: '/' });
      }
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
