import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { notFound } from 'next/navigation';
import ChapterReader from '@/components/chapter/ChapterReader';
import { getChapter, getMangaById } from '@/lib/data';

// force-dynamic: the root layout calls headers() for the CSP nonce,
// which conflicts with ISR static rendering and triggers DYNAMIC_SERVER_USAGE.
// DB queries use unstable_cache internally, so performance is preserved.
export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ mangaId: string; cap: string }>;
}

const BASE_URL = SITE_URL;

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
  // Number() rechaza strings parciales como "3abc" (parseFloat los aceptaría como 3)
  const capNum = Number(cap);

  if (!Number.isFinite(capNum) || capNum < 0) notFound();

  const [manga, chapter] = await Promise.all([
    getMangaById(mangaId),
    getChapter(mangaId, capNum),
  ]);

  if (!manga || !chapter) notFound();

  const allCaps = [...manga.chapters].sort((a, b) => a - b);
  const idx = allCaps.findIndex((c) => Math.abs(c - capNum) < 0.001);
  // idx === -1 cuando el capítulo existe pero la lista de manga.chapters aún es la
  // cacheada (tags 'chapters' y 'mangas' revalidan a distinto ritmo). Sin este
  // guardia, `allCaps[idx + 1]` devolvía allCaps[0] y "siguiente" apuntaba al cap. 1.
  const prevCap = idx > 0 ? allCaps[idx - 1] : null;
  const nextCap = idx !== -1 && idx < allCaps.length - 1 ? allCaps[idx + 1] : null;

  return (
    <ChapterReader
      manga={manga}
      chapter={chapter}
      prevCap={prevCap}
      nextCap={nextCap}
    />
  );
}
