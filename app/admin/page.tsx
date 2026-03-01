import { notFound } from 'next/navigation';
import { getAllMangas } from '@/lib/data';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // Bloqueado completamente en producción
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  const mangas = await getAllMangas();
  return <AdminClient initialMangas={mangas} />;
}
