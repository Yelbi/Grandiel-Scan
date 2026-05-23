import type { Metadata } from 'next';

export const revalidate = 300; // ISR: revalidar cada 5 minutos

import Link from 'next/link';
import MangaCard from '@/components/manga/MangaCard';
import ContinueReading from '@/components/manga/ContinueReading';
import HeroSection from '@/components/home/HeroSection';
import MostViewedPodium from '@/components/home/MostViewedPodium';
import { MangaGridSkeleton } from '@/components/manga/MangaCardSkeleton';
import { getAllMangas, getMostViewed } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Grandiel Scan - Manhwas en Español | Inicio',
  description:
    'Lee manhwas en español gratis. Descubre los mejores mangas y manhwas actualizados: Nano Machine, Maldita Reencarnación, Dungeon Reset y más.',
};

// JSON-LD hardcodeado — si en el futuro incluye datos dinámicos, sanitizar antes de serializar.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Grandiel Scan',
  url: 'https://grandielscan.com',
  description: 'Lee manhwas, mangas y manhuas en español gratis.',
};

export default async function HomePage() {
  // F-1: envolver en try/catch para evitar que un fallo de DB rompa toda la página
  let mangas: Awaited<ReturnType<typeof getAllMangas>> = [];
  let mostViewed: Awaited<ReturnType<typeof getMostViewed>> = [];

  try {
    [mangas, mostViewed] = await Promise.all([
      getAllMangas(),
      getMostViewed(3),
    ]);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') console.error('[HomePage] Error cargando datos:', err);
  }

  // F-7: orden explícito por fecha descendente como red de seguridad
  const sorted = [...mangas].sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
  );
  const recent = sorted.slice(0, 12);
  const heroCovers = sorted.slice(0, 18);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ===== HERO ===== */}
      <HeroSection heroCovers={heroCovers} />

      {/* ===== STATS BAR ===== */}
      {mangas.length > 0 && (
        <div className="stats-bar" aria-label="Estadísticas del sitio">
          <div className="stats-bar__item">
            <strong className="stats-bar__value">{mangas.length}+</strong>
            <span className="stats-bar__label">Títulos</span>
          </div>
          <div className="stats-bar__divider" aria-hidden="true" />
          <div className="stats-bar__item">
            <strong className="stats-bar__value">100%</strong>
            <span className="stats-bar__label">Gratis</span>
          </div>
          <div className="stats-bar__divider" aria-hidden="true" />
          <div className="stats-bar__item">
            <strong className="stats-bar__value">EN</strong>
            <span className="stats-bar__label">English</span>
          </div>
          <div className="stats-bar__divider" aria-hidden="true" />
          <div className="stats-bar__item">
            <strong className="stats-bar__value">ES</strong>
            <span className="stats-bar__label">Español</span>
          </div>
        </div>
      )}

      <div className="curva">
        {/* ===== CONTINUAR LEYENDO ===== */}
        {/* CLS prevenido por el estado mounted interno del componente (UX-4) */}
        <ContinueReading mangaImages={Object.fromEntries(mangas.map((m) => [m.id, m.image]))} />

        {/* ===== MÁS VISTOS ===== */}
        {mostViewed.length >= 1 && (
          <MostViewedPodium mangas={mostViewed} />
        )}

        {/* ===== RECIENTES ===== */}
        <section className="index-section" aria-label="Actualizaciones recientes" id="recientes">
          <h2 className="section-title">
            <i className="fas fa-clock" aria-hidden="true" />
            {' '}Actualizaciones Recientes
            {/* UX-6: enlace en el título para que el CTA sea visible sin scroll */}
            <Link href="/mangas" className="section-title__link" aria-label="Ver galería completa de mangas">
              Ver todo
            </Link>
          </h2>
          {recent.length > 0 ? (
            /* A-4: usar <ul>/<li> para semántica de lista correcta */
            <ul className="manga-grid manga-grid--recientes" role="list">
              {recent.map((manga) => (
                <li key={manga.id}>
                  <MangaCard manga={manga} />
                </li>
              ))}
            </ul>
          ) : (
            <MangaGridSkeleton count={12} />
          )}
          <div className="section-cta">
            <Link href="/mangas" className="btn">
              Ver galería completa
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
