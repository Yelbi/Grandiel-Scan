import type { NextConfig } from 'next';
import path from 'path';
import { withSentryConfig } from '@sentry/nextjs';

// La CSP con nonces se genera por request en middleware.ts.
// Aquí solo se definen los headers que son estáticos y no cambian por request.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Muestra las peticiones fetch del servidor en la consola durante dev
  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: false,
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dashboard.olympusscans.com',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'dashboard.olympusbiblioteca.com',
        pathname: '/storage/**',
      },
      // Supabase Storage (portadas almacenadas en el proyecto Supabase)
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // CDNs adicionales usados como origen de portadas
      { protocol: 'https', hostname: 'media.ikigaimangas.cloud' },
      { protocol: 'https', hostname: 'cdn.arenascan.com' },
      // Wildcards (*.host) NO cubren el apex (host) — registrar ambos.
      { protocol: 'https', hostname: '*.olympusbiblioteca.com' },
      { protocol: 'https', hostname: 'olympusbiblioteca.com' },
      { protocol: 'https', hostname: '*.olympusscans.com' },
      { protocol: 'https', hostname: 'olympusscans.com' },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // ── Subida de source maps ──────────────────────────────────────────────────
  // Sin estas tres variables el build sigue funcionando, pero los stack traces
  // llegan a Sentry minificados. La integración de Sentry en Vercel las inyecta.
  org:       process.env.SENTRY_ORG,
  project:   process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  sourcemaps: {
    disable: false,
    // Borrar los .map tras subirlos: si no, quedan servidos públicamente en
    // /_next/static y cualquiera puede leer el código fuente original.
    deleteSourcemapsAfterUpload: true,
  },
  // Incluye los chunks fuera de la carpeta de páginas para no perder frames del stack.
  widenClientFileUpload: true,

  // ── Envío de eventos desde el navegador ────────────────────────────────────
  // Los eventos salen por https://grandielscan.com/monitoring en vez de ir
  // directos a ingest.sentry.io. Dos motivos: la CSP de middleware.ts solo
  // permite connect-src 'self', y los bloqueadores de anuncios filtran sentry.io
  // (una parte grande del público de un sitio de manhwas los usa).
  // Ojo: /monitoring está excluido del matcher del middleware.
  tunnelRoute: '/monitoring',

  // Registra el cron de vercel.json (/api/cron/cleanup) como Cron Monitor en Sentry,
  // para enterarse también cuando NO se ejecuta.
  automaticVercelMonitors: true,

  // Silencioso en local; en CI/Vercel sí queremos ver si falla la subida de source maps.
  silent: !process.env.CI,
  disableLogger: true,
});
