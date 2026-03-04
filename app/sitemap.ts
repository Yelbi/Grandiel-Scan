import type { MetadataRoute } from 'next';
import { getAllMangas, getAllChapters } from '@/lib/data';

const BASE_URL = 'https://grandielscan.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [mangas, chapters] = await Promise.all([getAllMangas(), getAllChapters()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/mangas`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/actualizaciones`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  const mangaRoutes: MetadataRoute.Sitemap = mangas.map((manga) => ({
    url: `${BASE_URL}/manga/${manga.id}`,
    lastModified: manga.lastUpdated ? new Date(manga.lastUpdated) : new Date(),
    changeFrequency: manga.status === 'En Emision' ? 'weekly' : 'monthly',
    priority: 0.7,
  }));

  const chapterRoutes: MetadataRoute.Sitemap = chapters.map((chapter) => ({
    url: `${BASE_URL}/chapter/${chapter.mangaId}/${chapter.chapter}`,
    lastModified: new Date(),
    changeFrequency: 'yearly',
    priority: 0.5,
  }));

  return [...staticRoutes, ...mangaRoutes, ...chapterRoutes];
}
