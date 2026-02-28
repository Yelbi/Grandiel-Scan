import type { Metadata } from 'next';
import { getAllMangas } from '@/lib/data';
import NovedadesClient from './NovedadesClient';

export const metadata: Metadata = {
  title: 'Novedades',
  description: 'Últimas actualizaciones y nuevos títulos en Grandiel Scan.',
};

export default async function ActualizacionesPage() {
  const mangas = await getAllMangas();
  return <NovedadesClient mangas={mangas} />;
}
