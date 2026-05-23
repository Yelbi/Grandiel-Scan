import type { NextConfig } from 'next';
import path from 'path';

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

export default nextConfig;
