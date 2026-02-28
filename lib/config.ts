export const CONFIG = {
  MANGAS_JSON: '/data/mangas.json',
  CHAPTERS_JSON: '/data/chapters.json',
  STORAGE_KEYS: {
    THEME: 'grandiel-theme',
    FAVORITES: 'grandiel-favorites',
    HISTORY: 'grandiel-history',
    SEARCH_HISTORY: 'grandiel-search-history',
    SEEN_CHAPTERS: 'grandiel-seen-chapters',
    USER_PROFILE: 'grandiel-user-profile',
    READING_MODE: 'grandiel-reading-mode',
    READER_SETTINGS: 'grandiel-reader-settings',
    FILTERS: 'grandiel-filters',
    PREFERENCES: 'grandiel-preferences',
  },
  PAGINATION: {
    ITEMS_PER_PAGE: 24,
    MAX_HISTORY_ITEMS: 100,
    MAX_SEARCH_HISTORY: 20,
  },
} as const;

export const EVENTS = {
  THEME_CHANGE: 'grandiel:theme-change',
  SEARCH_UPDATE: 'grandiel:search-update',
  FILTER_UPDATE: 'grandiel:filter-update',
  DATA_LOADED: 'grandiel:data-loaded',
  FAVORITE_TOGGLE: 'grandiel:favorite-toggle',
  HISTORY_UPDATE: 'grandiel:history-update',
  READING_MODE_CHANGE: 'grandiel:reading-mode-change',
  NEW_CHAPTER_AVAILABLE: 'grandiel:new-chapter-available',
} as const;
