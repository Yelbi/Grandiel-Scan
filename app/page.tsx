import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';

// force-dynamic: root layout calls headers() for CSP nonce — incompatible with ISR.
// Data queries use unstable_cache internally, so DB performance is preserved.
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import MangaCard from '@/components/manga/MangaCard';
import ContinueReading from '@/components/manga/ContinueReading';
import HeroSection from '@/components/home/HeroSection';
import MostViewedPodium from '@/components/home/MostViewedPodium';
import { getRecentMangas, getMostViewed, getMangaCount, isDatabaseReachable } from '@/lib/data';

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
  url: SITE_URL,
  description: 'Lee manhwas, mangas y manhuas en español gratis.',
};

export default async function HomePage() {
  // Queries paralelas y acotadas: no se carga todo el catálogo, solo lo necesario.
  let recentMangas: Awaited<ReturnType<typeof getRecentMangas>> = [];
  let mostViewed: Awaited<ReturnType<typeof getMostViewed>> = [];
  let totalMangas = 0;

  try {
    [recentMangas, mostViewed, totalMangas] = await Promise.all([
      getRecentMangas(45),
      getMostViewed(3),
      getMangaCount(),
    ]);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') console.error('[HomePage] Error cargando datos:', err);
  }

  // Sin datos hay dos motivos muy distintos y hasta ahora se veían igual: que la
  // base no responda, o que de verdad no haya nada publicado. Solo se comprueba
  // en ese caso, así que no cuesta nada en el camino normal.
  const sinDatos = recentMangas.length === 0;
  const baseCaida = sinDatos ? !(await isDatabaseReachable()) : false;

  // DB ya devuelve ordenado por lastUpdated DESC — no se necesita re-ordenar.
  const recent = recentMangas.slice(0, 12);
  const heroCovers = recentMangas;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ===== HERO ===== */}
      <HeroSection heroCovers={heroCovers} />

      {/* ===== STATS BAR ===== */}
      {totalMangas > 0 && (
        <div className="stats-bar" aria-label="Estadísticas del sitio">
          <div className="stats-bar__item">
            <strong className="stats-bar__value">{totalMangas}+</strong>
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
        <ContinueReading mangaImages={Object.fromEntries(recentMangas.map((m) => [m.id, m.image]))} />

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
            /* Antes aquí había un esqueleto de carga. Como esta rama solo se
               alcanza cuando la consulta YA terminó y vino vacía, el esqueleto
               se quedaba parpadeando para siempre y era indistinguible de una
               página que nunca carga. */
            <div className="no-results">
              <i
                className={baseCaida ? 'fas fa-plug-circle-xmark' : 'fas fa-book-open'}
                aria-hidden="true"
              />
              {baseCaida ? (
                <>
                  <p>No se pudieron cargar los mangas en este momento.</p>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '.9rem' }}>
                    Es un problema temporal de nuestro lado. Vuelve a intentarlo en unos minutos.
                  </p>
                </>
              ) : (
                <p>Todavía no hay mangas publicados. Vuelve pronto.</p>
              )}
            </div>
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
