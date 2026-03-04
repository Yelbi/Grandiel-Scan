import type { Chapter } from './types';

/** Resuelve la URL completa de una imagen de capítulo */
export function resolvePageUrl(chapter: Chapter, page: string): string {
  if (page.startsWith('http')) return page;
  if (chapter.baseUrl) {
    const base = chapter.baseUrl.endsWith('/') ? chapter.baseUrl : chapter.baseUrl + '/';
    return base + page;
  }
  return page;
}
