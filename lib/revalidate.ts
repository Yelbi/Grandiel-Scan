import { revalidatePath } from 'next/cache';

/**
 * Purges cached pages affected by a manga update.
 * Call this from admin routes after creating/editing a manga or chapter.
 */
export function revalidateManga(mangaId: string) {
  revalidatePath('/');
  revalidatePath('/mangas');
  revalidatePath('/actualizaciones');
  revalidatePath(`/manga/${mangaId}`);
}

/** Purges the entire site cache (use sparingly). */
export function revalidateAll() {
  revalidatePath('/', 'layout');
}
