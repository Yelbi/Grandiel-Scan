/**
 * filter.js - Sistema de Filtrado y Ordenamiento
 * Grandiel Scan - Fase 3 Refactorización JavaScript
 *
 * Proporciona filtrado avanzado por género, tipo, estado
 * y ordenamiento dinámico con paginación.
 */

import { CONFIG, EVENTS, getState, updateState } from '../config.js';
import { FiltersStorage } from './storage.js';
import { Search } from './search.js';

const { FILTERS, PAGINATION } = CONFIG;

/**
 * Normaliza texto para comparación
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
 * Clase FilterManager - Gestiona filtros y ordenamiento
 */
class FilterManager {
    constructor() {
        this.currentFilters = {
            search: '',
            genres: [],
            type: null,
            status: null,
            sort: 'title-asc'
        };
        this.filteredResults = [];
        this.currentPage = 1;
    }

    /**
     * Inicializa los filtros desde localStorage
     */
    init() {
        const savedFilters = FiltersStorage.get();
        if (savedFilters) {
            this.currentFilters = { ...this.currentFilters, ...savedFilters };
            updateState('currentFilters', this.currentFilters);
        }
    }

    /**
     * Establece un filtro
     * @param {string} key - Nombre del filtro
     * @param {*} value - Valor del filtro
     */
    setFilter(key, value) {
        if (key in this.currentFilters) {
            this.currentFilters[key] = value;
            this.currentPage = 1; // Resetear a primera página
            updateState('currentFilters', this.currentFilters);

            // Guardar filtros
            FiltersStorage.save(this.currentFilters);

            // Disparar evento
            window.dispatchEvent(new CustomEvent(EVENTS.FILTER_UPDATE, {
                detail: { filters: this.currentFilters }
            }));
        }
    }

    /**
     * Agrega un género al filtro
     * @param {string} genre
     */
    addGenre(genre) {
        if (!this.currentFilters.genres.includes(genre)) {
            this.currentFilters.genres = [...this.currentFilters.genres, genre];
            this.setFilter('genres', this.currentFilters.genres);
        }
    }

    /**
     * Elimina un género del filtro
     * @param {string} genre
     */
    removeGenre(genre) {
        this.currentFilters.genres = this.currentFilters.genres.filter(g => g !== genre);
        this.setFilter('genres', this.currentFilters.genres);
    }

    /**
     * Alterna un género en el filtro
     * @param {string} genre
     */
    toggleGenre(genre) {
        if (this.currentFilters.genres.includes(genre)) {
            this.removeGenre(genre);
        } else {
            this.addGenre(genre);
        }
    }

    /**
     * Limpia todos los filtros
     */
    clearFilters() {
        this.currentFilters = {
            search: '',
            genres: [],
            type: null,
            status: null,
            sort: 'title-asc'
        };
        this.currentPage = 1;
        updateState('currentFilters', this.currentFilters);
        FiltersStorage.clear();

        window.dispatchEvent(new CustomEvent(EVENTS.FILTER_UPDATE, {
            detail: { filters: this.currentFilters }
        }));
    }

    /**
     * Obtiene los filtros actuales
     * @returns {Object}
     */
    getFilters() {
        return { ...this.currentFilters };
    }

    /**
     * Filtra un array de mangas según los filtros actuales
     * @param {Array} mangas - Array de mangas a filtrar
     * @returns {Array} Mangas filtrados
     */
    filterMangas(mangas) {
        if (!mangas || !Array.isArray(mangas)) return [];

        let filtered = [...mangas];

        // Filtrar por búsqueda de texto
        if (this.currentFilters.search) {
            const searchTerm = normalizeText(this.currentFilters.search);
            filtered = filtered.filter(manga =>
                normalizeText(manga.title).includes(searchTerm) ||
                normalizeText(manga.description).includes(searchTerm)
            );
        }

        // Filtrar por géneros (AND - debe tener todos los seleccionados)
        if (this.currentFilters.genres.length > 0) {
            filtered = filtered.filter(manga => {
                if (!manga.genres || manga.genres.length === 0) return false;
                const mangaGenres = manga.genres.map(g => normalizeText(g));
                return this.currentFilters.genres.every(genre =>
                    mangaGenres.includes(normalizeText(genre))
                );
            });
        }

        // Filtrar por tipo
        if (this.currentFilters.type) {
            const filterType = normalizeText(this.currentFilters.type);
            filtered = filtered.filter(manga =>
                normalizeText(manga.type) === filterType
            );
        }

        // Filtrar por estado
        if (this.currentFilters.status) {
            const filterStatus = normalizeText(this.currentFilters.status);
            filtered = filtered.filter(manga =>
                normalizeText(manga.status) === filterStatus
            );
        }

        // Ordenar resultados
        filtered = this.sortMangas(filtered, this.currentFilters.sort);

        this.filteredResults = filtered;
        return filtered;
    }

    /**
     * Ordena un array de mangas
     * @param {Array} mangas
     * @param {string} sortType
     * @returns {Array}
     */
    sortMangas(mangas, sortType = 'title-asc') {
        const sorted = [...mangas];

        switch (sortType) {
            case 'title-asc':
                sorted.sort((a, b) => a.title.localeCompare(b.title, 'es'));
                break;

            case 'title-desc':
                sorted.sort((a, b) => b.title.localeCompare(a.title, 'es'));
                break;

            case 'recent':
                // Ordenar por mangas con más capítulos recientes (simulado por cantidad)
                sorted.sort((a, b) => {
                    const aChapters = a.chapters?.length || 0;
                    const bChapters = b.chapters?.length || 0;
                    return bChapters - aChapters;
                });
                break;

            case 'popular':
                // Por ahora, ordenar por cantidad de capítulos como proxy de popularidad
                sorted.sort((a, b) => {
                    const aChapters = a.chapters?.length || 0;
                    const bChapters = b.chapters?.length || 0;
                    return bChapters - aChapters;
                });
                break;

            case 'chapters':
                sorted.sort((a, b) => {
                    const aChapters = a.chapters?.length || 0;
                    const bChapters = b.chapters?.length || 0;
                    return bChapters - aChapters;
                });
                break;

            default:
                break;
        }

        return sorted;
    }

    /**
     * Aplica paginación a los resultados
     * @param {Array} mangas
     * @param {number} page
     * @param {number} perPage
     * @returns {Object} { items, pagination }
     */
    paginate(mangas, page = 1, perPage = PAGINATION.ITEMS_PER_PAGE) {
        const totalItems = mangas.length;
        const totalPages = Math.ceil(totalItems / perPage);
        const currentPage = Math.min(Math.max(1, page), totalPages || 1);

        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;
        const items = mangas.slice(startIndex, endIndex);

        return {
            items,
            pagination: {
                currentPage,
                totalPages,
                totalItems,
                perPage,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1,
                startIndex: startIndex + 1,
                endIndex: Math.min(endIndex, totalItems)
            }
        };
    }

    /**
     * Obtiene mangas filtrados y paginados
     * @param {Array} mangas
     * @param {number} page
     * @returns {Object}
     */
    getFilteredAndPaginated(mangas, page = 1) {
        const filtered = this.filterMangas(mangas);
        return this.paginate(filtered, page);
    }

    /**
     * Cambia la página actual
     * @param {number} page
     */
    setPage(page) {
        this.currentPage = page;
        updateState('currentPage', page);

        window.dispatchEvent(new CustomEvent(EVENTS.FILTER_UPDATE, {
            detail: { filters: this.currentFilters, page }
        }));
    }

    /**
     * Va a la siguiente página
     */
    nextPage() {
        this.setPage(this.currentPage + 1);
    }

    /**
     * Va a la página anterior
     */
    prevPage() {
        if (this.currentPage > 1) {
            this.setPage(this.currentPage - 1);
        }
    }
}

// Instancia singleton
const filterManager = new FilterManager();

/**
 * Clase FilterUI - Gestiona la interfaz de filtros
 */
class FilterUI {
    constructor() {
        this.container = null;
        this.genreButtons = [];
        this.sortButtons = [];
    }

    /**
     * Inicializa la UI de filtros
     */
    init() {
        filterManager.init();

        // Buscar contenedor de categorías
        this.container = document.querySelector('.category_list');

        // Inicializar botones de género existentes
        this.initGenreButtons();

        // Inicializar botones de ordenamiento
        this.initSortButtons();

        // Escuchar eventos de filtro
        window.addEventListener(EVENTS.FILTER_UPDATE, (e) => {
            this.updateUI(e.detail.filters);
        });
    }

    /**
     * Inicializa los botones de género existentes en el DOM
     */
    initGenreButtons() {
        const categoryItems = document.querySelectorAll('.category_item');

        categoryItems.forEach(item => {
            const category = item.getAttribute('category');
            const type = item.getAttribute('tipo');

            item.addEventListener('click', (e) => {
                e.preventDefault();

                if (category === 'all') {
                    filterManager.clearFilters();
                    this.updateActiveStates(item);
                    this.triggerFilteredDisplay();
                    return;
                }

                // Si es un tipo
                if (type) {
                    filterManager.setFilter('type', type);
                } else if (category) {
                    filterManager.toggleGenre(category);
                }

                this.updateActiveStates(item);
                this.triggerFilteredDisplay();
            });
        });
    }

    /**
     * Inicializa los botones de ordenamiento
     */
    initSortButtons() {
        const sortableContainer = document.querySelector('.sortable');
        if (!sortableContainer) return;

        const buttons = sortableContainer.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const sortType = btn.dataset.sort;
                if (sortType) {
                    filterManager.setFilter('sort', sortType);
                    this.triggerFilteredDisplay();
                }
            });
        });
    }

    /**
     * Actualiza los estados activos de los botones
     * @param {HTMLElement} activeItem
     */
    updateActiveStates(activeItem) {
        const categoryItems = document.querySelectorAll('.category_item');
        categoryItems.forEach(item => {
            item.classList.remove('ct_item-active');
        });

        if (activeItem) {
            activeItem.classList.add('ct_item-active');
        }
    }

    /**
     * Actualiza la UI según los filtros
     * @param {Object} filters
     */
    updateUI(filters) {
        // Actualizar botones de género
        const categoryItems = document.querySelectorAll('.category_item');
        categoryItems.forEach(item => {
            const category = item.getAttribute('category');
            if (filters.genres.includes(category)) {
                item.classList.add('ct_item-active');
            } else if (category !== 'all') {
                item.classList.remove('ct_item-active');
            }
        });

        // Si no hay filtros activos, marcar "Todos"
        if (filters.genres.length === 0 && !filters.type && !filters.status) {
            const allButton = document.querySelector('.category_item[category="all"]');
            if (allButton) {
                allButton.classList.add('ct_item-active');
            }
        }
    }

    /**
     * Dispara la actualización del display filtrado
     */
    triggerFilteredDisplay() {
        window.dispatchEvent(new CustomEvent('grandiel:filter-display', {
            detail: { filters: filterManager.getFilters() }
        }));
    }

    /**
     * Crea controles de filtro dinámicos
     * @param {HTMLElement} container - Contenedor donde insertar los controles
     */
    createFilterControls(container) {
        if (!container) return;

        const html = `
            <div class="filter-controls">
                <div class="filter-section">
                    <h4>Género</h4>
                    <div class="filter-tags genre-tags">
                        ${FILTERS.GENRES.map(genre => `
                            <button class="filter-tag" data-genre="${genre}">
                                ${genre}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="filter-section">
                    <h4>Tipo</h4>
                    <div class="filter-tags type-tags">
                        <button class="filter-tag active" data-type="">Todos</button>
                        ${FILTERS.TYPES.map(type => `
                            <button class="filter-tag" data-type="${type}">
                                ${type}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="filter-section">
                    <h4>Estado</h4>
                    <div class="filter-tags status-tags">
                        <button class="filter-tag active" data-status="">Todos</button>
                        ${FILTERS.STATUS.map(status => `
                            <button class="filter-tag" data-status="${status}">
                                ${status}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="filter-section">
                    <h4>Ordenar por</h4>
                    <select class="filter-select" id="sort-select">
                        ${FILTERS.SORT_OPTIONS.map(opt => `
                            <option value="${opt.value}">${opt.label}</option>
                        `).join('')}
                    </select>
                </div>

                <button class="filter-clear-btn" id="clear-filters">
                    <i class="fas fa-times"></i> Limpiar filtros
                </button>
            </div>
        `;

        container.innerHTML = html;
        this.bindFilterEvents(container);
    }

    /**
     * Vincula eventos a los controles de filtro
     * @param {HTMLElement} container
     */
    bindFilterEvents(container) {
        // Géneros
        container.querySelectorAll('[data-genre]').forEach(btn => {
            btn.addEventListener('click', () => {
                const genre = btn.dataset.genre;
                btn.classList.toggle('active');
                filterManager.toggleGenre(genre);
                this.triggerFilteredDisplay();
            });
        });

        // Tipos
        container.querySelectorAll('[data-type]').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('[data-type]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterManager.setFilter('type', btn.dataset.type || null);
                this.triggerFilteredDisplay();
            });
        });

        // Estados
        container.querySelectorAll('[data-status]').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('[data-status]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterManager.setFilter('status', btn.dataset.status || null);
                this.triggerFilteredDisplay();
            });
        });

        // Ordenamiento
        const sortSelect = container.querySelector('#sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                filterManager.setFilter('sort', e.target.value);
                this.triggerFilteredDisplay();
            });
        }

        // Limpiar filtros
        const clearBtn = container.querySelector('#clear-filters');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                filterManager.clearFilters();
                // Resetear UI
                container.querySelectorAll('.filter-tag').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.type === '' || btn.dataset.status === '') {
                        btn.classList.add('active');
                    }
                });
                if (sortSelect) sortSelect.value = 'title-asc';
                this.triggerFilteredDisplay();
            });
        }
    }

    /**
     * Crea controles de paginación
     * @param {Object} pagination - Datos de paginación
     * @returns {string} HTML de paginación
     */
    createPaginationHTML(pagination) {
        const { currentPage, totalPages, hasNextPage, hasPrevPage } = pagination;

        if (totalPages <= 1) return '';

        let buttons = '';

        // Botón anterior
        buttons += `
            <button class="pagination-btn prev-btn" ${!hasPrevPage ? 'disabled' : ''} data-page="${currentPage - 1}">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Números de página
        const maxButtons = PAGINATION.MAX_PAGE_BUTTONS;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        if (startPage > 1) {
            buttons += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                buttons += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            buttons += `
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                buttons += `<span class="pagination-ellipsis">...</span>`;
            }
            buttons += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Botón siguiente
        buttons += `
            <button class="pagination-btn next-btn" ${!hasNextPage ? 'disabled' : ''} data-page="${currentPage + 1}">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        return `
            <div class="pagination">
                ${buttons}
            </div>
        `;
    }
}

// Instancia de UI
const filterUI = new FilterUI();

// Inicializar cuando el DOM esté listo
const initFilter = () => {
    filterUI.init();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFilter);
} else {
    initFilter();
}

// API pública
export const Filter = {
    setFilter: (key, value) => filterManager.setFilter(key, value),
    addGenre: (genre) => filterManager.addGenre(genre),
    removeGenre: (genre) => filterManager.removeGenre(genre),
    toggleGenre: (genre) => filterManager.toggleGenre(genre),
    clearFilters: () => filterManager.clearFilters(),
    getFilters: () => filterManager.getFilters(),
    filterMangas: (mangas) => filterManager.filterMangas(mangas),
    sortMangas: (mangas, sortType) => filterManager.sortMangas(mangas, sortType),
    paginate: (mangas, page, perPage) => filterManager.paginate(mangas, page, perPage),
    getFilteredAndPaginated: (mangas, page) => filterManager.getFilteredAndPaginated(mangas, page),
    setPage: (page) => filterManager.setPage(page),
    createFilterControls: (container) => filterUI.createFilterControls(container),
    createPaginationHTML: (pagination) => filterUI.createPaginationHTML(pagination),
    FILTERS: FILTERS
};

export default Filter;
