import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import { FavoritesProvider } from '@/components/providers/FavoritesProvider';
import { HistoryProvider } from '@/components/providers/HistoryProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

export const metadata: Metadata = {
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
    images: [{ url: '/img/logo.gif' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grandiel Scan - Manhwas en Español',
    description: 'Lee los mejores manhwas en español gratis.',
    images: ['/img/logo.gif'],
  },
};

export const viewport: Viewport = {
  themeColor: '#ff0000',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* FontAwesome */}
        <link
          rel="stylesheet"
          href="https://use.fontawesome.com/releases/v5.6.3/css/all.css"
        />
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Dosis:wght@400;500;600;700&family=Coming+Soon&display=swap"
          rel="stylesheet"
        />
        {/* GSAP */}
        <script
          defer
          src="https://cdn.jsdelivr.net/npm/gsap@3.12.2/dist/gsap.min.js"
        />
        <link rel="shortcut icon" href="/img/logo.jpg" />
      </head>
      <body className="fondo">
        <ThemeProvider>
          <FavoritesProvider>
            <HistoryProvider>
              <a href="#main-content" className="skip-to-main">
                Saltar al contenido principal
              </a>
              <Navbar />
              <main id="main-content">{children}</main>
            </HistoryProvider>
          </FavoritesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
