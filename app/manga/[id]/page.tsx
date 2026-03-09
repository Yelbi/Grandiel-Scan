import type { Metadata } from 'next';
import { after } from 'next/server';

export const revalidate = 600; // ISR: revalidate every 10 minutes
export const dynamicParams = true; // render on-demand, then cache
import { notFound } from 'next/navigation';
import MangaDetail from '@/components/manga/MangaDetail';
import { getMangaById, incrementViews } from '@/lib/data';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const manga = await getMangaById(id);
  if (!manga) return {};

  const description = `Lee ${manga.title} en español en Grandiel Scan. ${manga.description.substring(0, 150)}...`;

  return {
    title: `${manga.title} - Leer Online`,
    description,
    openGraph: {
      title: `${manga.title} - Grandiel Scan`,
      description,
      images: [{ url: manga.image }],
    },
  };
}

export default async function MangaPage({ params }: Props) {
  const { id } = await params;
  const manga = await getMangaById(id);

  if (!manga) notFound();

  // Incrementa el contador después de enviar la respuesta (no bloquea el render)
  after(() => incrementViews(id));

  return <MangaDetail manga={manga} />;
}
