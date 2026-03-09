export const CONFIG = {
  STORAGE_KEYS: {
    THEME: 'grandiel-theme',
    FAVORITES: 'grandiel-favorites',
    HISTORY: 'grandiel-history',
    READING_MODE: 'grandiel-reading-mode',
    READER_SETTINGS: 'grandiel-reader-settings',
    PROGRESS: 'grandiel-progress',
  },
  PAGINATION: {
    ITEMS_PER_PAGE: 36,
    MAX_HISTORY_ITEMS: 100,
  },
} as const;

/** Géneros válidos. Cualquier valor fuera de esta lista se filtra de la UI. */
export const ALLOWED_GENRES = [
  'Acción', 'Apocalíptico', 'Artes Marciales', 'Aventura', 'Bender',
  'Ciencia Ficción', 'Comedia', 'Demonios', 'Deporte', 'Drama',
  'Familia', 'Fantasía', 'Gore', 'Harem', 'Harem Inverso',
  'Histórico', 'Horror', 'Isekai', 'Josei', 'Magia',
  'Mecha', 'Militar', 'Misterio', 'Psicológico', 'Realidad Virtual',
  'Recuentos de la vida', 'Reencarnación', 'Regresion', 'Romance', 'Seinen',
  'Shonen', 'Shoujo', 'Sistema', 'Supernatural', 'Supervivencia',
  'Tragedia', 'Transmigración', 'Vida Escolar',
] as const;

export type Genre = typeof ALLOWED_GENRES[number];
