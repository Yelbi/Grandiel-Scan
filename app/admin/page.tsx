import { getAllMangasWithChapters } from '@/lib/data';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const mangas = await getAllMangasWithChapters();
  return <AdminClient initialMangas={mangas} />;
}
