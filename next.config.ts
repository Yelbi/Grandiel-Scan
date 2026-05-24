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
      { protocol: 'https', hostname: '*.olympusbiblioteca.com' },
      { protocol: 'https', hostname: '*.olympusscans.com' },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Subir source maps a Sentry en cada build de producción.
  // Requiere SENTRY_AUTH_TOKEN en las variables de entorno de Vercel.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true, // Silenciar logs de Sentry durante el build
  sourcemaps: { disable: false }, // Subir source maps solo en prod (ver SENTRY_AUTH_TOKEN)
  disableLogger: true,
});
