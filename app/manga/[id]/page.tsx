import type { Metadata } from 'next';

// force-dynamic: root layout calls headers() for CSP nonce — incompatible with ISR.
// generateStaticParams + revalidate = DYNAMIC_SERVER_USAGE crash in production.
// getMangaById uses unstable_cache with tag revalidation, so DB performance is preserved.
export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import MangaDetail from '@/components/manga/MangaDetail';
import { getMangaById } from '@/lib/data';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const manga = await getMangaById(id);
  if (!manga) return {};

  const BASE_URL = 'https://grandielscan.com';
  const descSnippet = manga.description.length > 150
    ? manga.description.substring(0, manga.description.lastIndexOf(' ', 150)) + '...'
    : manga.description;
  const description = `Lee ${manga.title} en español en Grandiel Scan. ${descSnippet}`;
  const imageUrl = manga.image.startsWith('http')
    ? manga.image
    : `${BASE_URL}${manga.image}`;

  return {
    title: `${manga.title} - Leer Online`,
    description,
    openGraph: {
      title: `${manga.title} - Grandiel Scan`,
      description,
      images: [{ url: imageUrl }],
    },
  };
}

export default async function MangaPage({ params }: Props) {
  const { id } = await params;
  const manga = await getMangaById(id);

  if (!manga) notFound();

  return <MangaDetail manga={manga} />;
}
