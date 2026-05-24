import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // strict-dynamic permite que scripts con nonce carguen otros (React hydration, etc.)
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' va.vercel-scripts.com`,
    // unsafe-inline es necesario para atributos style="" de React; no puede eliminarse sin
    // reemplazar todos los inline styles por clases CSS — limitación arquitectónica conocida.
    `style-src 'self' 'unsafe-inline' 'nonce-${nonce}' fonts.googleapis.com use.fontawesome.com`,
    "font-src 'self' fonts.gstatic.com use.fontawesome.com data:",
    "img-src 'self' data: blob: *.supabase.co dashboard.olympusscans.com dashboard.olympusbiblioteca.com media.ikigaimangas.cloud *.olympusbiblioteca.com olympusbiblioteca.com *.olympusscans.com olympusscans.com cdn.arenascan.com",
    // Incluir CDNs de imágenes para fetch() y push notifications.
    // Google Fonts debe estar aquí además de en style-src porque el SW intercepta
    // el fetch() de <link rel="stylesheet"> y connect-src rige las peticiones del SW.
    "connect-src 'self' *.supabase.co va.vercel-scripts.com dashboard.olympusscans.com dashboard.olympusbiblioteca.com media.ikigaimangas.cloud *.olympusbiblioteca.com olympusbiblioteca.com *.olympusscans.com olympusscans.com cdn.arenascan.com fonts.googleapis.com fonts.gstatic.com",
    "manifest-src 'self'",
    "worker-src 'self'",
    "frame-src 'none'",
  ].join('; ');
}

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
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  // Pasar nonce al layout a través de request headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);

  // response es mutable: Supabase puede añadir/renovar cookies de sesión
  let response = NextResponse.next({ request: { headers: requestHeaders } });

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
            response = NextResponse.next({ request: { headers: requestHeaders } });
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

  // CSP en la response final (persiste aunque Supabase recree el response)
  response.headers.set('Content-Security-Policy', csp);

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

    if (authHeader?.startsWith('Basic ') && adminPassword) {
      try {
        const decoded = atob(authHeader.slice(6));
        const colonIdx = decoded.indexOf(':');
        const password = colonIdx !== -1 ? decoded.slice(colonIdx + 1) : decoded;

        // timingSafeEqual previene ataques de timing que permiten adivinar el password
        // comparando tiempos de respuesta carácter a carácter.
        const pwdBuf   = new TextEncoder().encode(password);
        const adminBuf = new TextEncoder().encode(adminPassword);
        const lengthMatch = pwdBuf.length === adminBuf.length;
        // crypto.timingSafeEqual no existe en el Edge Runtime (Web Crypto API).
        // Comparación XOR manual: siempre itera todos los bytes para evitar timing attacks.
        const maxLen = Math.max(pwdBuf.length, adminBuf.length);
        let diff = 0;
        for (let i = 0; i < maxLen; i++) {
          diff |= (pwdBuf[i] ?? 0) ^ (adminBuf[i] ?? 0);
        }
        const match = lengthMatch && diff === 0;

        if (match) {
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
