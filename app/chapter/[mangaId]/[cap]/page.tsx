import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ChapterReader from '@/components/chapter/ChapterReader';
import { getChapter, getMangaById } from '@/lib/data';

export const revalidate = 86400; // ISR: revalidate every 24 hours (chapters rarely change)
export const dynamicParams = true; // render on-demand, then cache

interface Props {
  params: Promise<{ mangaId: string; cap: string }>;
}

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mangaId, cap } = await params;
  const manga = await getMangaById(mangaId);
  if (!manga) return {};

  return {
    title: `${manga.title} - Capítulo ${cap}`,
    description: `Lee el capítulo ${cap} de ${manga.title} en español.`,
  };
}

export default async function ChapterPage({ params }: Props) {
  const { mangaId, cap } = await params;
  const capNum = parseInt(cap, 10);

  if (isNaN(capNum)) notFound();

  const [manga, chapter] = await Promise.all([
    getMangaById(mangaId),
    getChapter(mangaId, capNum),
  ]);

  if (!manga || !chapter) notFound();

  const allCaps = manga.chapters.sort((a, b) => a - b);
  const idx = allCaps.indexOf(capNum);
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
