import type { Metadata } from 'next';

// force-dynamic: root layout calls headers() for CSP nonce — incompatible with ISR.
// Data queries use unstable_cache internally, so DB performance is preserved.
export const dynamic = 'force-dynamic';
import { getRecentMangas } from '@/lib/data';
import NovedadesClient from './NovedadesClient';

export const metadata: Metadata = {
  title: 'Novedades',
  description: 'Últimas actualizaciones y nuevos títulos en Grandiel Scan.',
};

export default async function ActualizacionesPage() {
  const mangas = await getRecentMangas(100);
  return <NovedadesClient mangas={mangas} />;
}
