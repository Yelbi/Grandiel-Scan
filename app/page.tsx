import type { Metadata } from 'next';

export const revalidate = 300; // ISR: revalidar cada 5 minutos

import Link from 'next/link';
import MangaCard from '@/components/manga/MangaCard';
import ContinueReading from '@/components/manga/ContinueReading';
import HeroSection from '@/components/home/HeroSection';
import MostViewedPodium from '@/components/home/MostViewedPodium';
import { getAllMangas, getMostViewed } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Grandiel Scan - Manhwas en Español | Inicio',
  description:
    'Lee manhwas en español gratis. Descubre los mejores mangas y manhwas actualizados: Nano Machine, Maldita Reencarnación, Dungeon Reset y más.',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Grandiel Scan',
  url: 'https://grandielscan.com',
  description: 'Lee manhwas, mangas y manhuas en español gratis.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://grandielscan.com/mangas?search={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

export default async function HomePage() {
  const [mangas, mostViewed] = await Promise.all([
    getAllMangas(),
    getMostViewed(3),
  ]);

  // getAllMangas ya devuelve los mangas ordenados por lastUpdated DESC
  const recent = mangas.slice(0, 12);

  // Todas las portadas existen (campo notNull en DB)
  const heroCovers = mangas.slice(0, 18);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ===== HERO ===== */}
      <HeroSection heroCovers={heroCovers} />

      {/* ===== STATS BAR ===== */}
      <div className="stats-bar" aria-label="Estadísticas del sitio">
        <div className="stats-bar__item">
          <strong className="stats-bar__value">{mangas.length}+</strong>
          <span className="stats-bar__label">Manhwas</span>
        </div>
        <div className="stats-bar__divider" aria-hidden="true" />
        <div className="stats-bar__item">
          <strong className="stats-bar__value">100%</strong>
          <span className="stats-bar__label">Gratis</span>
        </div>
        <div className="stats-bar__divider" aria-hidden="true" />
        <div className="stats-bar__item">
          <strong className="stats-bar__value">ES</strong>
          <span className="stats-bar__label">En Español</span>
        </div>
      </div>

      <div className="curva">
        {/* Continuar leyendo (client-side) */}
        <ContinueReading mangaImages={Object.fromEntries(mangas.map((m) => [m.id, m.image]))} />

        {/* ===== MÁS VISTOS ===== */}
        {mostViewed.length >= 1 && (
          <MostViewedPodium mangas={mostViewed} />
        )}

        {/* ===== RECIENTES ===== */}
        <section className="index-section" aria-label="Actualizaciones recientes">
          <h2 className="section-title">
            <i className="fas fa-clock" aria-hidden="true" /> Actualizaciones Recientes
          </h2>
          <div className="mami">
            {recent.map((manga) => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link href="/mangas" className="btn">
              Ver galería completa
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
