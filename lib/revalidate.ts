import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * Purges cached pages affected by a manga or chapter update.
 * Call this from admin routes after creating/editing/deleting a manga or chapter.
 * Pass chapterNum when a specific chapter page also needs revalidation.
 */
export function revalidateManga(mangaId: string, chapterNum?: number) {
  // Next.js 16: revalidateTag requires a cache profile as second argument.
  // Passing {} (empty CacheLifeConfig) triggers immediate revalidation.
  revalidateTag('mangas', {});
  revalidateTag('chapters', {});
  revalidatePath('/', 'page');
  revalidatePath('/mangas', 'page');
  revalidatePath('/actualizaciones', 'page');
  revalidatePath(`/manga/${mangaId}`, 'page');
  if (chapterNum !== undefined) {
    revalidatePath(`/chapter/${mangaId}/${chapterNum}`, 'page');
  }
}

