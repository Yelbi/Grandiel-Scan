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

const MS_MINUTE = 60_000;
const MS_HOUR   = 3_600_000;
const MS_DAY    = 86_400_000;

/**
 * Fecha relativa con precisión de minutos/horas.
 * Usada para timestamps de historial de lectura.
 */
export function relativeDateTime(timestamp: number): string {
  const diff    = Date.now() - timestamp;
  const minutes = Math.floor(diff / MS_MINUTE);
  const hours   = Math.floor(diff / MS_HOUR);
  const days    = Math.floor(diff / MS_DAY);
  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`;
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}
