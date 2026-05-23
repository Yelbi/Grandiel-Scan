import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * Purges cached pages affected by a manga or chapter update.
 * Call this from admin routes after creating/editing/deleting a manga or chapter.
 * Pass chapterNum when a specific chapter page also needs revalidation.
 */
export function revalidateManga(mangaId: string, chapterNum?: number) {
  revalidateTag('mangas');   // purge unstable_cache entries tagged 'mangas'
  revalidateTag('chapters'); // purge unstable_cache entries tagged 'chapters'
  revalidatePath('/');
  revalidatePath('/mangas');
  revalidatePath('/actualizaciones');
  revalidatePath(`/manga/${mangaId}`);
  if (chapterNum !== undefined) {
    revalidatePath(`/chapter/${mangaId}/${chapterNum}`);
  }
}

