import type { Metadata } from 'next';
import { getAllMangas } from '@/lib/data';
import PerfilClient from './PerfilClient';

export const metadata: Metadata = {
  title: 'Mi Perfil',
  description: 'Gestiona tu perfil, favoritos e historial de lectura en Grandiel Scan.',
};

export default async function PerfilPage() {
  const mangas = await getAllMangas();
  return <PerfilClient mangas={mangas} />;
}
