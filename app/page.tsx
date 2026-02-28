import type { Metadata } from 'next';
import Link from 'next/link';
import MangaCard from '@/components/manga/MangaCard';
import ContinueReading from '@/components/manga/ContinueReading';
import HeroSection from '@/components/home/HeroSection';
import { getAllMangas } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Grandiel Scan - Manhwas en Español | Inicio',
  description:
    'Lee manhwas en español gratis. Descubre los mejores mangas y manhwas actualizados: Nano Machine, Maldita Reencarnación, Dungeon Reset y más.',
};

const MOST_VIEWED_IDS = [
  'solo-leveling',
  'nano-machine',
  'maldita-reencarnacion',
  'dungeon-reset',
  'como-pelear',
  'existencia',
];

export default async function HomePage() {
  const mangas = await getAllMangas();

  const recent = [...mangas]
    .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
    .slice(0, 12);

  const mostViewed = mangas
    .filter((m) => MOST_VIEWED_IDS.includes(m.id))
    .sort((a, b) => MOST_VIEWED_IDS.indexOf(a.id) - MOST_VIEWED_IDS.indexOf(b.id));

  const heroCovers = mangas.filter((m) => m.image).slice(0, 5);

  return (
    <>
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
        <div className="stats-bar__divider" aria-hidden="true" />
        <div className="stats-bar__item">
          <strong className="stats-bar__value">
            <i className="fas fa-user-circle" aria-hidden="true" />
          </strong>
          <span className="stats-bar__label">Cuenta Gratis</span>
        </div>
      </div>

      <div className="curva">
        {/* Continuar leyendo (client-side) */}
        <ContinueReading mangas={mangas} />

        {/* ===== MÁS VISTOS ===== */}
        {mostViewed.length > 0 && (
          <section className="index-section" aria-label="Mangas más vistos">
            <h2 className="section-title">
              <i className="fas fa-fire" aria-hidden="true" /> Más Vistos
            </h2>
            <div className="mami">
              {mostViewed.map((manga) => (
                <MangaCard key={manga.id} manga={manga} />
              ))}
            </div>
          </section>
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
