import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MangaDetail from '@/components/manga/MangaDetail';
import { getAllMangas, getMangaById } from '@/lib/data';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const mangas = await getAllMangas();
  return mangas.map((m) => ({ id: m.id }));
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

  return <MangaDetail manga={manga} />;
}
