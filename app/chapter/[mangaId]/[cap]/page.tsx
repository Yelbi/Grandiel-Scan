import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ChapterReader from '@/components/chapter/ChapterReader';
import { getAllMangas, getChapter, getMangaById } from '@/lib/data';

export const revalidate = 3600; // ISR: revalidate every hour
export const dynamicParams = true; // render on-demand, then cache

interface Props {
  params: Promise<{ mangaId: string; cap: string }>;
}

export async function generateStaticParams() {
  const mangas = await getAllMangas();
  const params: { mangaId: string; cap: string }[] = [];
  for (const m of mangas) {
    const recent = [...m.chapters].sort((a, b) => b - a).slice(0, 3);
    for (const cap of recent) {
      params.push({ mangaId: m.id, cap: String(cap) });
    }
  }
  return params;
}

const BASE_URL = 'https://grandielscan.com';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mangaId, cap } = await params;
  const manga = await getMangaById(mangaId);
  if (!manga) return {};

  const imageUrl = manga.image.startsWith('http')
    ? manga.image
    : `${BASE_URL}${manga.image}`;

  return {
    title: `${manga.title} - Capítulo ${cap}`,
    description: `Lee el capítulo ${cap} de ${manga.title} en español.`,
    openGraph: {
      title: `${manga.title} - Capítulo ${cap} | Grandiel Scan`,
      description: `Lee el capítulo ${cap} de ${manga.title} en español.`,
      images: [{ url: imageUrl }],
    },
  };
}

export default async function ChapterPage({ params }: Props) {
  const { mangaId, cap } = await params;
  const capNum = parseFloat(cap);

  if (isNaN(capNum)) notFound();

  const [manga, chapter] = await Promise.all([
    getMangaById(mangaId),
    getChapter(mangaId, capNum),
  ]);

  if (!manga || !chapter) notFound();

  const allCaps = [...manga.chapters].sort((a, b) => a - b);
  const idx = allCaps.findIndex((c) => Math.abs(c - capNum) < 0.001);
  const prevCap = idx > 0 ? allCaps[idx - 1] : null;
  const nextCap = idx < allCaps.length - 1 ? allCaps[idx + 1] : null;

  return (
    <ChapterReader
      manga={manga}
      chapter={chapter}
      prevCap={prevCap}
      nextCap={nextCap}
    />
  );
}
