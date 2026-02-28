import type { Metadata } from 'next';
import FavoritosClient from './FavoritosClient';
import { getAllMangas } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Mis Favoritos',
  description: 'Gestiona tu lista de manhwas y mangas favoritos.',
};

export default async function FavoritosPage() {
  const mangas = await getAllMangas();
  return <FavoritosClient mangas={mangas} />;
}
