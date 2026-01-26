/**
 * config.js - Configuración Global
 * Grandiel Scan - Fase 3 Refactorización JavaScript
 *
 * Contiene todas las constantes y configuraciones del sitio.
 */

export const CONFIG = {
    // Información del sitio
    SITE_NAME: 'Grandiel Scan',
    SITE_URL: window.location.origin,

    // Rutas de datos
    DATA_PATH: '/data',
    MANGAS_JSON: '/data/mangas.json',
    CHAPTERS_JSON: '/data/chapters.json',

    // Rutas de páginas
    PAGES: {
        HOME: '/index.html',
        MANGAS: '/Mangas.html',
        UPDATES: '/Actualizaciones.html',
        NEW: '/Nuevos.html',
        MANGA_TEMPLATE: '/manga.html',
        CHAPTER_TEMPLATE: '/chapter.html'
    },

    // Configuración de búsqueda
    SEARCH: {
        DEBOUNCE_MS: 300,
        MIN_CHARS: 2,
        MAX_RESULTS: 20,
        FUZZY_THRESHOLD: 0.4 // 0-1, menor = más estricto
    },

    // Configuración de paginación
    PAGINATION: {
        ITEMS_PER_PAGE: 24,
        MAX_PAGE_BUTTONS: 5
    },

    // Configuración de filtros
    FILTERS: {
        GENRES: [
            'Acción', 'Aventura', 'Comedia', 'Drama', 'Fantasía',
            'Horror', 'Isekai', 'Misterio', 'Psicológico', 'Romance',
            'Sci-Fi', 'Seinen', 'Shounen', 'Slice of Life', 'Sobrenatural',
            'Deportes', 'Thriller', 'Artes Marciales', 'Reencarnación', 'Sistema'
        ],
        TYPES: ['Manhwa', 'Manga', 'Manhua', 'Webtoon'],
        STATUS: ['En Emision', 'Completado', 'En Pausa', 'Cancelado'],
        SORT_OPTIONS: [
            { value: 'title-asc', label: 'A-Z' },
            { value: 'title-desc', label: 'Z-A' },
            { value: 'recent', label: 'Más Reciente' },
            { value: 'popular', label: 'Más Popular' },
            { value: 'chapters', label: 'Más Capítulos' }
        ]
    },

    // Configuración de tema
    THEME: {
        STORAGE_KEY: 'grandiel-theme',
        DARK: 'dark',
        LIGHT: 'light',
        DEFAULT: 'dark'
    },

    // Configuración de localStorage keys
    STORAGE_KEYS: {
        THEME: 'grandiel-theme',
        FAVORITES: 'grandiel-favorites',
        HISTORY: 'grandiel-history',
        LAST_READ: 'grandiel-last-read',
        SEARCH_HISTORY: 'grandiel-search-history',
        PREFERENCES: 'grandiel-preferences',
        FILTERS: 'grandiel-filters'
    },

    // Configuración de caché
    CACHE: {
        MANGAS_TTL: 5 * 60 * 1000, // 5 minutos en ms
        CHAPTERS_TTL: 5 * 60 * 1000
    },

    // Animaciones
    ANIMATIONS: {
        TRANSITION_FAST: 150,
        TRANSITION_BASE: 200,
        TRANSITION_SLOW: 300
    },

    // Breakpoints (deben coincidir con CSS)
    BREAKPOINTS: {
        SM: 576,
        MD: 768,
        LG: 992,
        XL: 1200
    }
};

// Eventos personalizados
export const EVENTS = {
    THEME_CHANGE: 'grandiel:theme-change',
    SEARCH_UPDATE: 'grandiel:search-update',
    FILTER_UPDATE: 'grandiel:filter-update',
    DATA_LOADED: 'grandiel:data-loaded',
    FAVORITE_TOGGLE: 'grandiel:favorite-toggle',
    HISTORY_UPDATE: 'grandiel:history-update'
};

// Estado global de la aplicación
export const AppState = {
    mangas: [],
    chapters: {},
    isLoading: false,
    currentPage: 1,
    currentFilters: {
        search: '',
        genres: [],
        type: null,
        status: null,
        sort: 'title-asc'
    },
    favorites: [],
    history: [],
    theme: CONFIG.THEME.DEFAULT
};

/**
 * Actualiza el estado global
 * @param {string} key - Clave del estado
 * @param {*} value - Nuevo valor
 */
export const updateState = (key, value) => {
    if (key in AppState) {
        AppState[key] = value;

        // Disparar evento de cambio de estado
        window.dispatchEvent(new CustomEvent('grandiel:state-change', {
            detail: { key, value }
        }));
    }
};

/**
 * Obtiene un valor del estado
 * @param {string} key - Clave del estado
 * @returns {*} Valor del estado
 */
export const getState = (key) => {
    return AppState[key];
};

export default CONFIG;
