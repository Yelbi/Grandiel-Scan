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

/**
 * Gestión del perfil de usuario
 */
export const UserProfileStorage = {
    /**
     * Obtiene el perfil del usuario actual
     * @returns {Object|null} Perfil del usuario o null si no existe
     */
    get: () => storage.get(STORAGE_KEYS.USER_PROFILE, null),

    /**
     * Verifica si hay un usuario logueado
     * @returns {boolean}
     */
    isLoggedIn: () => UserProfileStorage.get() !== null,

    /**
     * Crea/registra un nuevo perfil de usuario
     * @param {Object} userData - Datos del usuario
     * @returns {Object} Perfil creado
     */
    create: (userData) => {
        const profile = {
            id: 'user_' + Date.now(),
            username: userData.username,
            avatar: userData.avatar || '/img/default-avatar.svg',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            settings: {
                readingMode: 'paginated',
                notifications: true,
                autoBookmark: true
            }
        };

        storage.set(STORAGE_KEYS.USER_PROFILE, profile);
        updateState('userProfile', profile);

        window.dispatchEvent(new CustomEvent(EVENTS.USER_PROFILE_CHANGE, {
            detail: { action: 'create', profile }
        }));

        return profile;
    },

    /**
     * Actualiza el perfil del usuario
     * @param {Object} updates - Campos a actualizar
     * @returns {Object|null} Perfil actualizado o null
     */
    update: (updates) => {
        const current = UserProfileStorage.get();
        if (!current) return null;

        const updated = {
            ...current,
            ...updates,
            updatedAt: Date.now()
        };

        storage.set(STORAGE_KEYS.USER_PROFILE, updated);
        updateState('userProfile', updated);

        window.dispatchEvent(new CustomEvent(EVENTS.USER_PROFILE_CHANGE, {
            detail: { action: 'update', profile: updated }
        }));

        return updated;
    },

    /**
     * Actualiza los ajustes del usuario
     * @param {Object} settings - Ajustes a actualizar
     * @returns {Object|null} Perfil actualizado o null
     */
    updateSettings: (settings) => {
        const current = UserProfileStorage.get();
        if (!current) return null;

        return UserProfileStorage.update({
            settings: { ...current.settings, ...settings }
        });
    },

    /**
     * Cierra sesión (elimina el perfil)
     */
    logout: () => {
        const profile = UserProfileStorage.get();
        storage.remove(STORAGE_KEYS.USER_PROFILE);
        updateState('userProfile', null);

        window.dispatchEvent(new CustomEvent(EVENTS.USER_PROFILE_CHANGE, {
            detail: { action: 'logout', profile }
        }));
    },

    /**
     * Obtiene el nombre de usuario para mostrar
     * @returns {string} Nombre de usuario o 'Invitado'
     */
    getDisplayName: () => {
        const profile = UserProfileStorage.get();
        return profile ? profile.username : 'Invitado';
    },

    /**
     * Obtiene el avatar del usuario
     * @returns {string} URL del avatar
     */
    getAvatar: () => {
        const profile = UserProfileStorage.get();
        return profile ? profile.avatar : '/img/default-avatar.png';
    }
};

/**
 * Gestión del modo de lectura
 */
export const ReadingModeStorage = {
    MODES: {
        PAGINATED: 'paginated',
        CONTINUOUS: 'continuous'
    },

    /**
     * Obtiene el modo de lectura actual
     * @returns {string} Modo de lectura
     */
    get: () => {
        const profile = UserProfileStorage.get();
        if (profile && profile.settings) {
            return profile.settings.readingMode || 'paginated';
        }
        return storage.get('grandiel-reading-mode', 'paginated');
    },

    /**
     * Establece el modo de lectura
     * @param {string} mode - 'paginated' o 'continuous'
     */
    set: (mode) => {
        const validModes = ['paginated', 'continuous'];
        if (!validModes.includes(mode)) return;

        // Si hay usuario logueado, guardar en perfil
        const profile = UserProfileStorage.get();
        if (profile) {
            UserProfileStorage.updateSettings({ readingMode: mode });
        } else {
            storage.set('grandiel-reading-mode', mode);
        }

        updateState('readingMode', mode);

        window.dispatchEvent(new CustomEvent(EVENTS.READING_MODE_CHANGE, {
            detail: { mode }
        }));
    },

    /**
     * Alterna entre modos de lectura
     * @returns {string} Nuevo modo
     */
    toggle: () => {
        const current = ReadingModeStorage.get();
        const newMode = current === 'paginated' ? 'continuous' : 'paginated';
        ReadingModeStorage.set(newMode);
        return newMode;
    }
};

/**
 * Gestión de comentarios
 */
export const CommentsStorage = {
    /**
     * Obtiene todos los comentarios
     * @returns {Object} Objeto con comentarios por mangaId
     */
    getAll: () => storage.get(STORAGE_KEYS.COMMENTS, {}),

    /**
     * Obtiene comentarios de un manga específico
     * @param {string} mangaId
     * @returns {Array} Lista de comentarios
     */
    getByManga: (mangaId) => {
        const all = CommentsStorage.getAll();
        return all[mangaId] || [];
    },

    /**
     * Obtiene comentarios de un capítulo específico
     * @param {string} mangaId
     * @param {number} chapter
     * @returns {Array} Lista de comentarios
     */
    getByChapter: (mangaId, chapter) => {
        const mangaComments = CommentsStorage.getByManga(mangaId);
        return mangaComments.filter(c => c.chapter === chapter);
    },

    /**
     * Agrega un nuevo comentario
     * @param {Object} comment - Datos del comentario
     * @returns {Object} Comentario creado
     */
    add: (comment) => {
        const profile = UserProfileStorage.get();
        if (!profile) return null; // Requiere usuario logueado

        const all = CommentsStorage.getAll();
        const mangaId = comment.mangaId;

        if (!all[mangaId]) {
            all[mangaId] = [];
        }

        const newComment = {
            id: 'comment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            mangaId: comment.mangaId,
            chapter: comment.chapter || null,
            text: comment.text,
            userId: profile.id,
            username: profile.username,
            avatar: profile.avatar,
            createdAt: Date.now(),
            updatedAt: null,
            likes: 0,
            replies: []
        };

        all[mangaId].unshift(newComment);
        storage.set(STORAGE_KEYS.COMMENTS, all);

        window.dispatchEvent(new CustomEvent(EVENTS.COMMENT_ADDED, {
            detail: { comment: newComment }
        }));

        return newComment;
    },

    /**
     * Edita un comentario existente
     * @param {string} commentId
     * @param {string} newText
     * @returns {Object|null} Comentario actualizado o null
     */
    edit: (commentId, newText) => {
        const profile = UserProfileStorage.get();
        if (!profile) return null;

        const all = CommentsStorage.getAll();
        let updated = null;

        for (const mangaId in all) {
            const index = all[mangaId].findIndex(c => c.id === commentId && c.userId === profile.id);
            if (index !== -1) {
                all[mangaId][index].text = newText;
                all[mangaId][index].updatedAt = Date.now();
                updated = all[mangaId][index];
                break;
            }
        }

        if (updated) {
            storage.set(STORAGE_KEYS.COMMENTS, all);
        }

        return updated;
    },

    /**
     * Elimina un comentario
     * @param {string} commentId
     * @returns {boolean} Éxito de la operación
     */
    delete: (commentId) => {
        const profile = UserProfileStorage.get();
        if (!profile) return false;

        const all = CommentsStorage.getAll();
        let deleted = false;

        for (const mangaId in all) {
            const index = all[mangaId].findIndex(c => c.id === commentId && c.userId === profile.id);
            if (index !== -1) {
                all[mangaId].splice(index, 1);
                deleted = true;
                break;
            }
        }

        if (deleted) {
            storage.set(STORAGE_KEYS.COMMENTS, all);
            window.dispatchEvent(new CustomEvent(EVENTS.COMMENT_DELETED, {
                detail: { commentId }
            }));
        }

        return deleted;
    },

    /**
     * Cuenta los comentarios de un manga
     * @param {string} mangaId
     * @returns {number}
     */
    countByManga: (mangaId) => {
        return CommentsStorage.getByManga(mangaId).length;
    }
};

/**
 * Gestión de capítulos vistos (para notificaciones)
 */
export const SeenChaptersStorage = {
    /**
     * Obtiene todos los capítulos vistos
     * @returns {Object} Objeto con mangaId -> array de capítulos vistos
     */
    getAll: () => storage.get(STORAGE_KEYS.SEEN_CHAPTERS, {}),

    /**
     * Marca un capítulo como visto
     * @param {string} mangaId
     * @param {number} chapter
     */
    markSeen: (mangaId, chapter) => {
        const all = SeenChaptersStorage.getAll();
        if (!all[mangaId]) {
            all[mangaId] = [];
        }
        if (!all[mangaId].includes(chapter)) {
            all[mangaId].push(chapter);
            storage.set(STORAGE_KEYS.SEEN_CHAPTERS, all);
        }
    },

    /**
     * Marca todos los capítulos de un manga como vistos
     * @param {string} mangaId
     * @param {Array} chapters - Lista de números de capítulo
     */
    markAllSeen: (mangaId, chapters) => {
        const all = SeenChaptersStorage.getAll();
        all[mangaId] = [...new Set([...(all[mangaId] || []), ...chapters])];
        storage.set(STORAGE_KEYS.SEEN_CHAPTERS, all);
    },

    /**
     * Verifica si un capítulo ha sido visto
     * @param {string} mangaId
     * @param {number} chapter
     * @returns {boolean}
     */
    isSeen: (mangaId, chapter) => {
        const all = SeenChaptersStorage.getAll();
        return all[mangaId]?.includes(chapter) || false;
    },

    /**
     * Obtiene capítulos no vistos de un manga
     * @param {string} mangaId
     * @param {Array} allChapters - Lista de todos los capítulos disponibles
     * @returns {Array} Capítulos no vistos
     */
    getUnseen: (mangaId, allChapters) => {
        const seen = SeenChaptersStorage.getAll()[mangaId] || [];
        return allChapters.filter(ch => !seen.includes(ch));
    },

    /**
     * Cuenta capítulos no vistos
     * @param {string} mangaId
     * @param {Array} allChapters
     * @returns {number}
     */
    countUnseen: (mangaId, allChapters) => {
        return SeenChaptersStorage.getUnseen(mangaId, allChapters).length;
    }
};

/**
 * Gestión de ajustes del lector
 */
export const ReaderSettingsStorage = {
    DEFAULTS: {
        zoom: 100,
        brightness: 100,
        contrast: 100,
        fitMode: 'width', // 'width', 'height', 'original'
        backgroundColor: '#000000'
    },

    /**
     * Obtiene los ajustes del lector
     * @returns {Object}
     */
    get: () => {
        const saved = storage.get(STORAGE_KEYS.READER_SETTINGS, null);
        return { ...ReaderSettingsStorage.DEFAULTS, ...saved };
    },

    /**
     * Guarda los ajustes del lector
     * @param {Object} settings
     */
    set: (settings) => {
        const current = ReaderSettingsStorage.get();
        const updated = { ...current, ...settings };
        storage.set(STORAGE_KEYS.READER_SETTINGS, updated);
        return updated;
    },

    /**
     * Resetea los ajustes a valores por defecto
     */
    reset: () => {
        storage.remove(STORAGE_KEYS.READER_SETTINGS);
        return ReaderSettingsStorage.DEFAULTS;
    }
};

// Exportar instancia del storage para uso directo si es necesario
export default storage;
