import type { Metadata } from 'next';
import HistorialClient from './HistorialClient';
import { getAllMangas } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Historial de Lectura',
  description: 'Tu historial de capítulos leídos en Grandiel Scan.',
};

export default async function HistorialPage() {
  const mangas = await getAllMangas();
  return <HistorialClient mangas={mangas} />;
}
