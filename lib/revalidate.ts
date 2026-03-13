import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * Purges cached pages affected by a manga update.
 * Call this from admin routes after creating/editing a manga or chapter.
 */
export function revalidateManga(mangaId: string) {
  revalidateTag('mangas'); // purges unstable_cache entries tagged 'mangas'
  revalidatePath('/');
  revalidatePath('/mangas');
  revalidatePath('/actualizaciones');
  revalidatePath(`/manga/${mangaId}`);
}

