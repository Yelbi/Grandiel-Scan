import type { Metadata } from 'next';
import Link from 'next/link';
import MangaCard from '@/components/manga/MangaCard';
import { getAllMangas } from '@/lib/data';
import ContinueReading from '@/components/manga/ContinueReading';

export const metadata: Metadata = {
  title: 'Grandiel Scan - Manhwas en Español | Inicio',
  description:
    'Lee manhwas en español gratis. Descubre los mejores mangas y manhwas actualizados: Nano Machine, Maldita Reencarnación, Dungeon Reset y más.',
};

const FEATURED_IDS = [
  'maldita-reencarnacion',
  'dungeon-reset',
  'existencia',
  'nano-machine',
  'como-pelear',
  'solo-leveling',
];

export default async function HomePage() {
  const mangas = await getAllMangas();
  const recent = [...mangas]
    .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
    .slice(0, 12);
  const featured = mangas.filter((m) => FEATURED_IDS.includes(m.id)).slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="hero" aria-label="Bienvenida a Grandiel Scan">
        <div className="hero__bg-glow" />
        <div className="hero__content">
          <p className="hero__eyebrow">Grandiel Scan</p>
          <h1 className="hero__title">
            Lee los mejores <span className="hero__accent">manhwas</span> en español
          </h1>
          <p className="hero__subtitle">
            Catálogo actualizado con los títulos más populares. Gratis, en español, sin registros.
          </p>
          <div className="hero__actions">
            <Link href="/mangas" className="hero__btn-primary">
              Explorar Catálogo
            </Link>
            <Link href="/actualizaciones" className="hero__btn-secondary">
              Ver Novedades
            </Link>
          </div>
        </div>
      </section>

      <div className="curva">
        {/* Continuar leyendo (client-side) */}
        <ContinueReading mangas={mangas} />

        {/* Recomendados */}
        {featured.length > 0 && (
          <section className="index-section" aria-label="Manhwas recomendados">
            <h2 className="section-title">Recomendados</h2>
            <div className="manga-grid">
              {featured.map((manga) => (
                <MangaCard key={manga.id} manga={manga} />
              ))}
            </div>
          </section>
        )}

        {/* Recientes */}
        <section className="index-section" aria-label="Actualizaciones recientes">
          <h2 className="section-title">Actualizaciones Recientes</h2>
          <div className="manga-grid">
            {recent.map((manga) => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link href="/mangas" className="btn">
              Ver todos los mangas
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
