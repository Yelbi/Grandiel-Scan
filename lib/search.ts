import type { Manga } from './types';

/** Normaliza texto para búsqueda: lowercase, sin acentos */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Distancia de Levenshtein para búsqueda fuzzy */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export interface SearchResult {
  manga: Manga;
  score: number;
}

/**
 * Busca mangas por título y géneros con fuzzy matching.
 * Devuelve resultados ordenados por relevancia.
 */
export function searchMangas(mangas: Manga[], query: string): SearchResult[] {
  if (!query.trim()) return [];

  const normalizedQuery = normalizeText(query);
  const results: SearchResult[] = [];

  for (const manga of mangas) {
    const normalizedTitle = normalizeText(manga.title);

    // Coincidencia exacta al inicio del título → máxima prioridad
    if (normalizedTitle.startsWith(normalizedQuery)) {
      results.push({ manga, score: 100 });
      continue;
    }

    // Contiene el query en el título
    if (normalizedTitle.includes(normalizedQuery)) {
      results.push({ manga, score: 80 });
      continue;
    }

    // Normalizar géneros una sola vez por manga
    const normalizedGenres = manga.genres.map(normalizeText);

    // Coincidencia exacta en género
    if (normalizedGenres.some((g) => g === normalizedQuery)) {
      results.push({ manga, score: 70 });
      continue;
    }

    // El género contiene el query
    if (normalizedGenres.some((g) => g.includes(normalizedQuery))) {
      results.push({ manga, score: 60 });
      continue;
    }

    // Fuzzy matching sobre palabras del título
    const words = normalizedTitle.split(' ');
    for (const word of words) {
      const distance = levenshteinDistance(normalizedQuery, word);
      const maxLen = Math.max(normalizedQuery.length, word.length);
      const similarity = 1 - distance / maxLen;

      if (similarity >= 0.7) {
        results.push({ manga, score: Math.round(similarity * 55) });
        break;
      }
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
