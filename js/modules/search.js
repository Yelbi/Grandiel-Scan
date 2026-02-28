/**
 * search.js - Sistema de Búsqueda Dinámico
 * Grandiel Scan - Fase 3 Refactorización JavaScript
 *
 * Proporciona búsqueda en tiempo real con debounce,
 * búsqueda fuzzy y resaltado de resultados.
 */

import { CONFIG, EVENTS, getState, updateState } from '../config.js';
import { SearchHistoryStorage } from './storage.js';

const { SEARCH, MANGAS_JSON } = CONFIG;

/**
 * Utilidad: Debounce
 * Retrasa la ejecución de una función hasta que haya pasado un tiempo
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function}
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Normaliza un texto para búsqueda
 * Elimina acentos y convierte a minúsculas
 * @param {string} text
 * @returns {string}
 */
const normalizeText = (text) => {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
};

/**
 * Calcula la distancia de Levenshtein entre dos strings
 * Útil para búsqueda fuzzy
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
const levenshteinDistance = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

/**
 * Calcula el puntaje de similitud entre dos strings
 * @param {string} str1
 * @param {string} str2
 * @returns {number} 0-1, donde 1 es coincidencia exacta
 */
const getSimilarity = (str1, str2) => {
    const s1 = normalizeText(str1);
    const s2 = normalizeText(str2);

    // Coincidencia exacta
    if (s1 === s2) return 1;

    // Si uno contiene al otro
    if (s1.includes(s2) || s2.includes(s1)) {
        return 0.9;
    }

    // Búsqueda por palabras
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);

    let matchingWords = 0;
    for (const word of words2) {
        if (words1.some(w => w.includes(word) || word.includes(w))) {
            matchingWords++;
        }
    }

    if (matchingWords > 0) {
        return 0.5 + (0.4 * matchingWords / words2.length);
    }

    // Distancia de Levenshtein para coincidencias parciales
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength === 0) return 1;

    const distance = levenshteinDistance(s1, s2);
    return Math.max(0, 1 - distance / maxLength);
};

/**
 * Escapa caracteres especiales HTML para prevenir XSS
 * @param {string} str
 * @returns {string}
 */
const escapeHTML = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

/**
 * Resalta el texto de búsqueda en un string
 * @param {string} text - Texto original
 * @param {string} query - Texto a resaltar
 * @returns {string} HTML con texto resaltado
 */
export const highlightMatch = (text, query) => {
    if (!query || !text) return text;

    const normalizedQuery = normalizeText(query);
    const normalizedText = normalizeText(text);
    const index = normalizedText.indexOf(normalizedQuery);

    if (index === -1) return text;

    const before = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length);

    return `${before}<mark class="search-highlight">${match}</mark>${after}`;
};

/**
 * Clase SearchManager - Gestiona la búsqueda
 */
class SearchManager {
    constructor() {
        this.mangas = [];
        this.isLoaded = false;
        this.cache = null;
        this.cacheTime = 0;
    }

    /**
     * Carga los datos de mangas desde el JSON
     * @returns {Promise<Array>}
     */
    async loadMangas() {
        // Usar datos del estado global si existen
        const stateMangas = getState('mangas');
        if (stateMangas?.length > 0) {
            this.mangas = stateMangas;
            this.isLoaded = true;
            return this.mangas;
        }

        // Verificar caché
        const now = Date.now();
        if (this.cache && (now - this.cacheTime) < CONFIG.CACHE.MANGAS_TTL) {
            return this.cache;
        }

        try {
            const response = await fetch(MANGAS_JSON);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.mangas = data.mangas || [];
            this.isLoaded = true;

            // Actualizar caché
            this.cache = this.mangas;
            this.cacheTime = now;

            // Actualizar estado global
            updateState('mangas', this.mangas);

            // Disparar evento de datos cargados
            window.dispatchEvent(new CustomEvent(EVENTS.DATA_LOADED, {
                detail: { mangas: this.mangas }
            }));

            return this.mangas;
        } catch (error) {
            console.error('Error al cargar mangas:', error);
            return [];
        }
    }

    /**
     * Busca mangas que coincidan con la query
     * @param {string} query - Texto de búsqueda
     * @param {Object} options - Opciones de búsqueda
     * @returns {Promise<Array>}
     */
    async search(query, options = {}) {
        const {
            fuzzy = true,
            maxResults = SEARCH.MAX_RESULTS,
            minChars = SEARCH.MIN_CHARS,
            threshold = SEARCH.FUZZY_THRESHOLD
        } = options;

        // Validar longitud mínima
        if (!query || query.length < minChars) {
            return [];
        }

        // Asegurar que los datos estén cargados
        if (!this.isLoaded) {
            await this.loadMangas();
        }

        const normalizedQuery = normalizeText(query);
        const results = [];

        for (const manga of this.mangas) {
            // Buscar en título
            const titleScore = getSimilarity(manga.title, query);

            // Buscar en descripción (con menor peso)
            const descScore = manga.description
                ? getSimilarity(manga.description, query) * 0.5
                : 0;

            // Buscar en géneros
            const genreScore = manga.genres?.some(g =>
                normalizeText(g).includes(normalizedQuery)
            ) ? 0.3 : 0;

            // Puntuación total
            const score = Math.max(titleScore, descScore, genreScore);

            // Incluir si supera el umbral
            if (score >= threshold) {
                results.push({
                    ...manga,
                    score,
                    highlightedTitle: highlightMatch(manga.title, query)
                });
            }
        }

        // Ordenar por puntuación (mayor primero)
        results.sort((a, b) => b.score - a.score);

        // Limitar resultados
        return results.slice(0, maxResults);
    }

    /**
     * Búsqueda por coincidencia exacta (más rápida)
     * @param {string} query
     * @returns {Promise<Array>}
     */
    async quickSearch(query) {
        if (!query || query.length < SEARCH.MIN_CHARS) {
            return [];
        }

        if (!this.isLoaded) {
            await this.loadMangas();
        }

        const normalizedQuery = normalizeText(query);

        return this.mangas.filter(manga => {
            const normalizedTitle = normalizeText(manga.title);
            return normalizedTitle.includes(normalizedQuery);
        }).slice(0, SEARCH.MAX_RESULTS);
    }

    /**
     * Obtiene sugerencias basadas en el historial
     * @param {string} query
     * @returns {Array}
     */
    getSuggestions(query) {
        const history = SearchHistoryStorage.getAll();
        const normalizedQuery = normalizeText(query);

        return history.filter(item =>
            normalizeText(item).includes(normalizedQuery)
        ).slice(0, 5);
    }

    /**
     * Guarda una búsqueda en el historial
     * @param {string} query
     */
    saveToHistory(query) {
        if (query && query.length >= SEARCH.MIN_CHARS) {
            SearchHistoryStorage.add(query);
        }
    }
}

// Instancia singleton
const searchManager = new SearchManager();

/**
 * Clase SearchUI - Gestiona la interfaz de búsqueda
 */
class SearchUI {
    constructor() {
        this.input = null;
        this.resultsContainer = null;
        this.coverElement = null;
        this.isOpen = false;
        this.debouncedSearch = debounce(this.performSearch.bind(this), SEARCH.DEBOUNCE_MS);
    }

    /**
     * Inicializa la UI de búsqueda
     */
    init() {
        this.input = document.getElementById('inputSearch');
        this.resultsContainer = document.getElementById('box-search');
        this.coverElement = document.getElementById('cover-ctn-search');
        const iconSearch = document.getElementById('icon-search');
        const ctnBarsSearch = document.getElementById('ctn-bars-search');

        if (!this.input || !this.resultsContainer) {
            console.warn('Elementos de búsqueda no encontrados');
            return;
        }

        // Event listeners
        this.input.addEventListener('input', (e) => {
            this.debouncedSearch(e.target.value);
        });

        this.input.addEventListener('focus', () => {
            if (this.input.value.length >= SEARCH.MIN_CHARS) {
                this.showResults();
            }
        });

        this.input.addEventListener('keydown', (e) => {
            this.handleKeyNavigation(e);
        });

        // Click en icono de búsqueda
        if (iconSearch) {
            iconSearch.addEventListener('click', () => this.toggleSearch());
        }

        // Click en cover para cerrar
        if (this.coverElement) {
            this.coverElement.addEventListener('click', () => this.hideSearch());
        }

        // Cerrar al hacer click fuera
        if (ctnBarsSearch) {
            ctnBarsSearch.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    if (!ctnBarsSearch.matches(':hover') && !this.input.matches(':focus')) {
                        this.hideResults();
                    }
                }, 200);
            });
        }

        // Cargar datos al inicializar
        searchManager.loadMangas();
    }

    /**
     * Realiza la búsqueda
     * @param {string} query
     */
    async performSearch(query) {
        if (!query || query.length < SEARCH.MIN_CHARS) {
            this.hideResults();
            return;
        }

        try {
            const results = await searchManager.search(query);
            this.renderResults(results, query);

            // Disparar evento de actualización
            window.dispatchEvent(new CustomEvent(EVENTS.SEARCH_UPDATE, {
                detail: { query, results }
            }));
        } catch (error) {
            console.error('Error en búsqueda:', error);
            this.renderError();
        }
    }

    /**
     * Renderiza los resultados de búsqueda
     * @param {Array} results
     * @param {string} query
     */
    renderResults(results, query) {
        if (!this.resultsContainer) return;

        if (results.length === 0) {
            this.resultsContainer.innerHTML = `
                <li class="search-no-results">
                    <span>No se encontraron resultados para "${escapeHTML(query)}"</span>
                </li>
            `;
            this.showResults();
            return;
        }

        const html = results.map(manga => {
            const url = `/manga.html?id=${manga.id}`;
            const chaptersCount = manga.chapters?.length || 0;

            return `
                <li class="search-result-item">
                    <a href="${url}" data-manga-id="${manga.id}">
                        <div class="search-result-content">
                            <i class="fas fa-book" aria-hidden="true"></i>
                            <div class="search-result-info">
                                <span class="search-result-title">${manga.highlightedTitle || manga.title}</span>
                                <span class="search-result-meta">${manga.type} · ${chaptersCount} caps</span>
                            </div>
                        </div>
                    </a>
                </li>
            `;
        }).join('');

        this.resultsContainer.innerHTML = html;
        this.showResults();

        // Guardar búsqueda en historial si hay resultados
        if (results.length > 0) {
            searchManager.saveToHistory(query);
        }
    }

    /**
     * Renderiza mensaje de error
     */
    renderError() {
        if (!this.resultsContainer) return;

        this.resultsContainer.innerHTML = `
            <li class="search-error">
                <span>Error al realizar la búsqueda</span>
            </li>
        `;
        this.showResults();
    }

    /**
     * Maneja la navegación por teclado
     * @param {KeyboardEvent} e
     */
    handleKeyNavigation(e) {
        const items = this.resultsContainer?.querySelectorAll('.search-result-item a');
        if (!items || items.length === 0) return;

        const currentIndex = Array.from(items).findIndex(
            item => item === document.activeElement
        );

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                items[nextIndex]?.focus();
                break;

            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                items[prevIndex]?.focus();
                break;

            case 'Escape':
                this.hideSearch();
                this.input?.blur();
                break;

            case 'Enter':
                if (currentIndex === -1 && items[0]) {
                    items[0].click();
                }
                break;
        }
    }

    /**
     * Muestra/oculta la búsqueda
     */
    toggleSearch() {
        if (this.isOpen) {
            this.hideSearch();
        } else {
            this.showSearch();
        }
    }

    /**
     * Muestra la búsqueda
     */
    showSearch() {
        this.isOpen = true;
        if (this.coverElement) {
            this.coverElement.style.display = 'block';
        }
        this.input?.focus();
    }

    /**
     * Oculta la búsqueda
     */
    hideSearch() {
        this.isOpen = false;
        if (this.coverElement) {
            this.coverElement.style.display = 'none';
        }
        if (this.input) {
            this.input.value = '';
        }
        this.hideResults();
    }

    /**
     * Muestra el contenedor de resultados
     */
    showResults() {
        if (this.resultsContainer) {
            this.resultsContainer.style.display = 'block';
        }
    }

    /**
     * Oculta el contenedor de resultados
     */
    hideResults() {
        if (this.resultsContainer) {
            this.resultsContainer.style.display = 'none';
        }
    }
}

// Instancia de UI
const searchUI = new SearchUI();

// Inicializar cuando el DOM esté listo
const initSearch = () => {
    searchUI.init();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearch);
} else {
    initSearch();
}

// API pública
export const Search = {
    search: (query, options) => searchManager.search(query, options),
    quickSearch: (query) => searchManager.quickSearch(query),
    loadMangas: () => searchManager.loadMangas(),
    getHistory: () => SearchHistoryStorage.getAll(),
    clearHistory: () => SearchHistoryStorage.clear()
};

export default Search;
