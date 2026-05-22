import type { NextConfig } from 'next';
import path from 'path';

const securityHeaders = [
  // Impide que la app sea embebida en iframes (clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Evita que el navegador infiera el tipo MIME incorrecto
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Controla cuánta información de referrer se envía
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Deshabilita permisos de hardware no usados
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // HSTS: fuerza HTTPS por 1 año (activar solo en producción con dominio propio)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  // CSP: restringe carga de recursos. unsafe-inline necesario por FontAwesome inline y GSAP.
  // Mejorable con nonces de Next.js en el futuro.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Scripts: self + CDNs usados (GSAP, FontAwesome inline)
      "script-src 'self' 'unsafe-inline' cdn.jsdelivr.net va.vercel-scripts.com",
      // Estilos: self + Google Fonts + FontAwesome
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com use.fontawesome.com",
      // Fuentes
      "font-src 'self' fonts.gstatic.com use.fontawesome.com data:",
      // Imágenes: self + CDNs de portadas y páginas de manga
      "img-src 'self' data: blob: *.supabase.co dashboard.olympusscans.com dashboard.olympusbiblioteca.com media.ikigaimangas.cloud *.olympusbiblioteca.com *.olympusscans.com cdn.arenascan.com",
      // Conexiones API: self + Supabase
      "connect-src 'self' *.supabase.co va.vercel-scripts.com",
      // Manifesto PWA
      "manifest-src 'self'",
      // Workers service worker
      "worker-src 'self'",
      // No frames de sitios externos
      "frame-src 'none'",
    ].join('; '),
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
    ],
  },
};

export default nextConfig;
