/**
 * storage.js - Gestión de localStorage
 * Grandiel Scan - Fase 3 Refactorización JavaScript
 *
 * Proporciona una API unificada para el almacenamiento local
 * con manejo de errores, serialización y sincronización.
 */

import { CONFIG, EVENTS, updateState } from '../config.js';

const { STORAGE_KEYS } = CONFIG;

/**
 * Clase Storage - Gestiona el almacenamiento local
 */
class StorageManager {
    constructor() {
        this.isAvailable = this.checkAvailability();
        this.listeners = new Map();

        if (this.isAvailable) {
            this.setupStorageListener();
        }
    }

    /**
     * Verifica si localStorage está disponible
     * @returns {boolean}
     */
    checkAvailability() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage no disponible:', e);
            return false;
        }
    }

    /**
     * Configura el listener para sincronización entre pestañas
     */
    setupStorageListener() {
        window.addEventListener('storage', (event) => {
            if (event.key && Object.values(STORAGE_KEYS).includes(event.key)) {
                const callback = this.listeners.get(event.key);
                if (callback) {
                    const newValue = event.newValue ? JSON.parse(event.newValue) : null;
                    callback(newValue, event.oldValue ? JSON.parse(event.oldValue) : null);
                }

                // Disparar evento personalizado
                window.dispatchEvent(new CustomEvent('grandiel:storage-sync', {
                    detail: {
                        key: event.key,
                        newValue: event.newValue,
                        oldValue: event.oldValue
                    }
                }));
            }
        });
    }

    /**
     * Guarda un valor en localStorage
     * @param {string} key - Clave de almacenamiento
     * @param {*} value - Valor a guardar
     * @returns {boolean} - Éxito de la operación
     */
    set(key, value) {
        if (!this.isAvailable) return false;

        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
            return true;
        } catch (e) {
            console.error(`Error al guardar en localStorage [${key}]:`, e);

            // Intentar limpiar si el error es por cuota excedida
            if (e.name === 'QuotaExceededError') {
                this.cleanup();
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                    return true;
                } catch (retryError) {
                    console.error('Error después de limpieza:', retryError);
                }
            }
            return false;
        }
    }

    /**
     * Obtiene un valor de localStorage
     * @param {string} key - Clave de almacenamiento
     * @param {*} defaultValue - Valor por defecto si no existe
     * @returns {*} - Valor almacenado o default
     */
    get(key, defaultValue = null) {
        if (!this.isAvailable) return defaultValue;

        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error(`Error al leer de localStorage [${key}]:`, e);
            return defaultValue;
        }
    }

    /**
     * Elimina un valor de localStorage
     * @param {string} key - Clave a eliminar
     * @returns {boolean}
     */
    remove(key) {
        if (!this.isAvailable) return false;

        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`Error al eliminar de localStorage [${key}]:`, e);
            return false;
        }
    }

    /**
     * Limpia datos antiguos para liberar espacio
     */
    cleanup() {
        // Limpia historial de búsqueda si es muy grande
        const searchHistory = this.get(STORAGE_KEYS.SEARCH_HISTORY, []);
        if (searchHistory.length > 50) {
            this.set(STORAGE_KEYS.SEARCH_HISTORY, searchHistory.slice(0, 20));
        }

        // Limita el historial de lectura
        const history = this.get(STORAGE_KEYS.HISTORY, []);
        if (history.length > 100) {
            this.set(STORAGE_KEYS.HISTORY, history.slice(0, 50));
        }
    }

    /**
     * Registra un listener para cambios en una clave
     * @param {string} key - Clave a observar
     * @param {Function} callback - Función a ejecutar en cambios
     */
    onChange(key, callback) {
        this.listeners.set(key, callback);
    }

    /**
     * Elimina un listener
     * @param {string} key - Clave del listener
     */
    removeListener(key) {
        this.listeners.delete(key);
    }
}

// Instancia única del StorageManager
const storage = new StorageManager();

// ==================== API de Alto Nivel ====================

/**
 * Gestión del tema
 */
export const ThemeStorage = {
    get: () => storage.get(STORAGE_KEYS.THEME, CONFIG.THEME.DEFAULT),
    set: (theme) => storage.set(STORAGE_KEYS.THEME, theme)
};

/**
 * Gestión de favoritos
 */
export const FavoritesStorage = {
    getAll: () => storage.get(STORAGE_KEYS.FAVORITES, []),

    add: (mangaId) => {
        const favorites = FavoritesStorage.getAll();
        if (!favorites.includes(mangaId)) {
            favorites.unshift(mangaId);
            storage.set(STORAGE_KEYS.FAVORITES, favorites);
            updateState('favorites', favorites);

            window.dispatchEvent(new CustomEvent(EVENTS.FAVORITE_TOGGLE, {
                detail: { mangaId, action: 'add' }
            }));
        }
        return favorites;
    },

    remove: (mangaId) => {
        const favorites = FavoritesStorage.getAll().filter(id => id !== mangaId);
        storage.set(STORAGE_KEYS.FAVORITES, favorites);
        updateState('favorites', favorites);

        window.dispatchEvent(new CustomEvent(EVENTS.FAVORITE_TOGGLE, {
            detail: { mangaId, action: 'remove' }
        }));
        return favorites;
    },

    toggle: (mangaId) => {
        const favorites = FavoritesStorage.getAll();
        if (favorites.includes(mangaId)) {
            return FavoritesStorage.remove(mangaId);
        }
        return FavoritesStorage.add(mangaId);
    },

    isFavorite: (mangaId) => FavoritesStorage.getAll().includes(mangaId)
};

/**
 * Gestión del historial de lectura
 */
export const HistoryStorage = {
    getAll: () => storage.get(STORAGE_KEYS.HISTORY, []),

    add: (entry) => {
        const history = HistoryStorage.getAll();
        const existingIndex = history.findIndex(h => h.mangaId === entry.mangaId);

        const newEntry = {
            mangaId: entry.mangaId,
            chapter: entry.chapter,
            timestamp: Date.now(),
            title: entry.title || ''
        };

        if (existingIndex > -1) {
            history.splice(existingIndex, 1);
        }

        history.unshift(newEntry);

        // Limitar a 100 entradas
        const limitedHistory = history.slice(0, 100);
        storage.set(STORAGE_KEYS.HISTORY, limitedHistory);
        updateState('history', limitedHistory);

        window.dispatchEvent(new CustomEvent(EVENTS.HISTORY_UPDATE, {
            detail: { entry: newEntry }
        }));

        return limitedHistory;
    },

    getLastRead: (mangaId) => {
        const history = HistoryStorage.getAll();
        return history.find(h => h.mangaId === mangaId);
    },

    clear: () => {
        storage.set(STORAGE_KEYS.HISTORY, []);
        updateState('history', []);
    }
};

/**
 * Gestión del historial de búsqueda
 */
export const SearchHistoryStorage = {
    getAll: () => storage.get(STORAGE_KEYS.SEARCH_HISTORY, []),

    add: (query) => {
        if (!query || query.length < 2) return;

        const history = SearchHistoryStorage.getAll();
        const filtered = history.filter(q => q.toLowerCase() !== query.toLowerCase());
        filtered.unshift(query);

        const limited = filtered.slice(0, 20);
        storage.set(STORAGE_KEYS.SEARCH_HISTORY, limited);
        return limited;
    },

    clear: () => storage.set(STORAGE_KEYS.SEARCH_HISTORY, [])
};

/**
 * Gestión de preferencias de usuario
 */
export const PreferencesStorage = {
    get: () => storage.get(STORAGE_KEYS.PREFERENCES, {
        itemsPerPage: CONFIG.PAGINATION.ITEMS_PER_PAGE,
        defaultSort: 'title-asc',
        showAdultContent: false
    }),

    set: (preferences) => {
        const current = PreferencesStorage.get();
        const updated = { ...current, ...preferences };
        storage.set(STORAGE_KEYS.PREFERENCES, updated);
        return updated;
    },

    reset: () => {
        storage.remove(STORAGE_KEYS.PREFERENCES);
    }
};

/**
 * Gestión de filtros guardados
 */
export const FiltersStorage = {
    get: () => storage.get(STORAGE_KEYS.FILTERS, null),

    save: (filters) => {
        storage.set(STORAGE_KEYS.FILTERS, filters);
        updateState('currentFilters', filters);
    },

    clear: () => {
        storage.remove(STORAGE_KEYS.FILTERS);
    }
};

// Exportar instancia del storage para uso directo si es necesario
export default storage;
