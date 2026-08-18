import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { headers } from 'next/headers';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Providers from '@/components/providers/Providers';
import SwRegister from '@/components/SwRegister';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import { CONFIG } from '@/lib/config';

export const metadata: Metadata = {
  metadataBase: new URL('https://grandielscan.com'),
  title: {
    default: 'Grandiel Scan - Manhwas en Español',
    template: '%s | Grandiel Scan',
  },
  description:
    'Lee manhwas en español gratis. Descubre los mejores mangas y manhwas actualizados.',
  keywords: ['manhwa español', 'manga online', 'manhwa gratis', 'scan español'],
  authors: [{ name: 'Grandiel Scan' }],
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    siteName: 'Grandiel Scan',
    title: 'Grandiel Scan - Manhwas en Español',
    description:
      'Lee los mejores manhwas en español gratis. Actualizaciones diarias.',
    images: [{ url: '/img/logo.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grandiel Scan - Manhwas en Español',
    description: 'Lee los mejores manhwas en español gratis.',
    images: ['/img/logo.jpg'],
  },
};

export const viewport: Viewport = {
  themeColor: '#ff0000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get('x-nonce') ?? '';

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/*
          Script bloqueante mínimo: aplica el tema ANTES del primer paint.
          Usa el nonce del middleware para cumplir con la CSP sin unsafe-inline.
        */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('${CONFIG.STORAGE_KEYS.THEME}');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Manga image CDNs */}
        <link rel="preconnect" href="https://dashboard.olympusscans.com" />
        <link rel="preconnect" href="https://dashboard.olympusbiblioteca.com" />
        {/* FontAwesome CDN — preconnect para que el download empiece temprano */}
        <link rel="preconnect" href="https://use.fontawesome.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Dosis:wght@400;500;600;700&family=Coming+Soon&display=swap"
          rel="stylesheet"
        />
        <link rel="shortcut icon" href="/img/logo.jpg" />
      </head>
      <body className="fondo" suppressHydrationWarning>
        {/* skip-link es el primer elemento focusable del documento (A-9) */}
        <a href="#main-content" className="skip-to-main">
          Saltar al contenido principal
        </a>
        <Providers>
          <SwRegister />
          <Navbar />
          <main id="main-content">{children}</main>
          <SpeedInsights />
          <Analytics />
        </Providers>
        {/*
          FontAwesome v5.15.4 — strategy="afterInteractive" lo carga inmediatamente
          tras la hidratación de React, reduciendo el FOUC frente a "lazyOnload"
          sin bloquear el First Contentful Paint.
          Bug A-1 fix: onLoad en <link> dentro de RSC requiere función JS, no string;
          se usa Script + dangerouslySetInnerHTML para inyectar correctamente.
        */}
        <Script
          id="fontawesome"
          nonce={nonce}
          suppressHydrationWarning
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://use.fontawesome.com/releases/v5.15.4/css/all.css';document.head.appendChild(l);})();`,
          }}
        />
      </body>
    </html>
  );
}
