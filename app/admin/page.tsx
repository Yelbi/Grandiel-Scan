import { getAllMangas } from '@/lib/data';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const mangas = await getAllMangas();
  return <AdminClient initialMangas={mangas} />;
}
