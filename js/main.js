/**
 * main.js - Punto de Entrada Principal
 * Grandiel Scan - Fase 3 Refactorización JavaScript
 *
 * Inicializa todos los módulos y coordina la aplicación.
 */

// Importar configuración
import { CONFIG, EVENTS, getState, updateState } from './config.js';

// Importar módulos
import { ThemeStorage, FavoritesStorage, HistoryStorage } from './modules/storage.js';
import Theme from './modules/theme.js';
import Search from './modules/search.js';
import Filter from './modules/filter.js';
import Navigation from './modules/navigation.js';

/**
 * Clase principal de la aplicación
 */
class GrandielApp {
    constructor() {
        this.isInitialized = false;
        this.modules = {
            theme: Theme,
            search: Search,
            filter: Filter,
            navigation: Navigation
        };
    }

    /**
     * Inicializa la aplicación
     */
    async init() {
        if (this.isInitialized) return;

        console.log(`[Grandiel Scan] Iniciando aplicación v1.0.0`);

        try {
            // Cargar datos de localStorage
            this.loadStoredData();

            // Pre-cargar datos de mangas
            await this.preloadData();

            // Configurar event listeners globales
            this.setupGlobalListeners();

            // Detectar y configurar página actual
            this.setupCurrentPage();

            this.isInitialized = true;
            console.log('[Grandiel Scan] Aplicación inicializada correctamente');

            // Disparar evento de aplicación lista
            window.dispatchEvent(new CustomEvent('grandiel:ready'));

        } catch (error) {
            console.error('[Grandiel Scan] Error al inicializar:', error);
        }
    }

    /**
     * Carga datos almacenados en localStorage
     */
    loadStoredData() {
        // Cargar tema
        const savedTheme = ThemeStorage.get();
        if (savedTheme) {
            updateState('theme', savedTheme);
        }

        // Cargar favoritos
        const favorites = FavoritesStorage.getAll();
        updateState('favorites', favorites);

        // Cargar historial
        const history = HistoryStorage.getAll();
        updateState('history', history);
    }

    /**
     * Pre-carga datos necesarios
     */
    async preloadData() {
        try {
            const mangas = await Search.loadMangas();
            console.log(`[Grandiel Scan] Cargados ${mangas.length} mangas`);
        } catch (error) {
            console.warn('[Grandiel Scan] No se pudieron pre-cargar los mangas:', error);
        }
    }

    /**
     * Configura event listeners globales
     */
    setupGlobalListeners() {
        // Escuchar cambios de tema
        window.addEventListener(EVENTS.THEME_CHANGE, (e) => {
            console.log(`[Grandiel Scan] Tema cambiado a: ${e.detail.theme}`);
        });

        // Escuchar cambios de filtro
        window.addEventListener(EVENTS.FILTER_UPDATE, (e) => {
            this.handleFilterUpdate(e.detail);
        });

        // Escuchar solicitudes de display filtrado
        window.addEventListener('grandiel:filter-display', (e) => {
            this.updateFilteredDisplay(e.detail.filters);
        });

        // Escuchar toggle de favoritos
        window.addEventListener(EVENTS.FAVORITE_TOGGLE, (e) => {
            this.handleFavoriteToggle(e.detail);
        });

        // Escuchar clics en botones de favorito
        document.addEventListener('click', (e) => {
            const favoriteBtn = e.target.closest('[data-favorite-toggle]');
            if (favoriteBtn) {
                e.preventDefault();
                const mangaId = favoriteBtn.dataset.mangaId;
                if (mangaId) {
                    FavoritesStorage.toggle(mangaId);
                    this.updateFavoriteButton(favoriteBtn, mangaId);
                }
            }
        });

        // Escuchar clics en paginación
        document.addEventListener('click', (e) => {
            const pageBtn = e.target.closest('.pagination-btn');
            if (pageBtn && !pageBtn.disabled) {
                e.preventDefault();
                const page = parseInt(pageBtn.dataset.page);
                if (page) {
                    Filter.setPage(page);
                    this.updateFilteredDisplay(Filter.getFilters());
                }
            }
        });

        // Sincronización entre pestañas
        window.addEventListener('grandiel:storage-sync', (e) => {
            console.log('[Grandiel Scan] Sincronización de storage:', e.detail.key);
            // Recargar datos sincronizados
            if (e.detail.key === CONFIG.STORAGE_KEYS.FAVORITES) {
                updateState('favorites', FavoritesStorage.getAll());
            }
        });
    }

    /**
     * Configura la página actual
     */
    setupCurrentPage() {
        const path = window.location.pathname;

        // Página de Mangas
        if (path.includes('Mangas.html') || path === '/Mangas.html') {
            this.setupMangasPage();
        }

        // Página de manga individual
        if (path.includes('manga.html')) {
            this.setupMangaPage();
        }

        // Página de capítulo
        if (path.includes('chapter.html')) {
            this.setupChapterPage();
        }

        // Página de inicio
        if (path === '/' || path.includes('index.html')) {
            this.setupHomePage();
        }
    }

    /**
     * Configura la página de listado de mangas
     */
    setupMangasPage() {
        console.log('[Grandiel Scan] Configurando página de Mangas');

        // Escuchar datos cargados
        window.addEventListener(EVENTS.DATA_LOADED, () => {
            this.updateFilteredDisplay(Filter.getFilters());
        });

        // Si ya hay datos, actualizar display
        const mangas = getState('mangas');
        if (mangas?.length > 0) {
            setTimeout(() => {
                this.updateFilteredDisplay(Filter.getFilters());
            }, 100);
        }
    }

    /**
     * Configura la página de manga individual
     */
    setupMangaPage() {
        const params = new URLSearchParams(window.location.search);
        const mangaId = params.get('id');

        if (!mangaId) return;

        console.log(`[Grandiel Scan] Configurando página de manga: ${mangaId}`);

        // Verificar si es favorito y actualizar botón
        setTimeout(() => {
            const favoriteBtn = document.querySelector('[data-favorite-toggle]');
            if (favoriteBtn) {
                this.updateFavoriteButton(favoriteBtn, mangaId);
            }
        }, 100);
    }

    /**
     * Configura la página de capítulo
     */
    setupChapterPage() {
        const params = new URLSearchParams(window.location.search);
        const mangaId = params.get('manga');
        const chapter = parseInt(params.get('cap'));

        if (!mangaId || !chapter) return;

        console.log(`[Grandiel Scan] Configurando capítulo: ${mangaId} - Cap. ${chapter}`);

        // Registrar en historial
        const mangas = getState('mangas');
        const manga = mangas?.find(m => m.id === mangaId);

        HistoryStorage.add({
            mangaId,
            chapter,
            title: manga?.title || mangaId
        });

        // Barra de progreso de lectura
        this.setupReadingProgress();
    }

    /**
     * Configura la página de inicio
     */
    setupHomePage() {
        console.log('[Grandiel Scan] Configurando página de inicio');

        // Mostrar sección de continuar leyendo
        const continueSection = document.querySelector('.continue-reading-container');
        if (continueSection) {
            continueSection.innerHTML = Navigation.generateContinueReadingHTML();
        }
    }

    /**
     * Actualiza el display con mangas filtrados
     * @param {Object} filters
     */
    async updateFilteredDisplay(filters) {
        const container = document.querySelector('#lista, .mami, .product-container');
        if (!container) return;

        const mangas = getState('mangas');
        if (!mangas || mangas.length === 0) {
            await Search.loadMangas();
        }

        const currentMangas = getState('mangas') || [];
        const currentPage = getState('currentPage') || 1;

        // Aplicar filtros y paginación
        const { items, pagination } = Filter.getFilteredAndPaginated(currentMangas, currentPage);

        // Actualizar grid de mangas
        this.renderMangaGrid(container, items);

        // Actualizar paginación
        this.updatePagination(pagination);

        // Actualizar contador de resultados
        this.updateResultsCounter(pagination);
    }

    /**
     * Renderiza el grid de mangas
     * @param {HTMLElement} container
     * @param {Array} mangas
     */
    renderMangaGrid(container, mangas) {
        if (!container) return;

        if (mangas.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No se encontraron mangas con los filtros seleccionados</p>
                    <button class="btn" onclick="window.GrandielApp.Filter.clearFilters()">
                        Limpiar filtros
                    </button>
                </div>
            `;
            return;
        }

        const html = mangas.map(manga => {
            const url = `/manga.html?id=${manga.id}`;
            const chaptersCount = manga.chapters?.length || 0;
            const isFavorite = FavoritesStorage.isFavorite(manga.id);

            return `
                <div class="product-item manga-card" category="${manga.genres?.join(' ') || ''}" tipo="${manga.type || 'Manhwa'}">
                    <a href="${url}">
                        <img src="${manga.image}" alt="${manga.title}" loading="lazy">
                    </a>
                    <h3>
                        <a href="${url}">${manga.title}</a>
                    </h3>
                    <div class="manga-meta">
                        <span class="manga-type">${manga.type || 'Manhwa'}</span>
                        <span class="manga-chapters">${chaptersCount} caps</span>
                    </div>
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}"
                            data-favorite-toggle
                            data-manga-id="${manga.id}"
                            aria-label="${isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
            `;
        }).join('');

        container.innerHTML = html;

        // Aplicar animación de entrada
        const items = container.querySelectorAll('.manga-card');
        items.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            setTimeout(() => {
                item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }

    /**
     * Actualiza la paginación
     * @param {Object} pagination
     */
    updatePagination(pagination) {
        let paginationContainer = document.querySelector('.pagination-container');

        if (!paginationContainer) {
            paginationContainer = document.createElement('div');
            paginationContainer.className = 'pagination-container';

            const mainContainer = document.querySelector('.curva, .container, main');
            if (mainContainer) {
                mainContainer.appendChild(paginationContainer);
            }
        }

        paginationContainer.innerHTML = Filter.createPaginationHTML(pagination);
    }

    /**
     * Actualiza el contador de resultados
     * @param {Object} pagination
     */
    updateResultsCounter(pagination) {
        let counter = document.querySelector('.results-counter');

        if (!counter) {
            counter = document.createElement('div');
            counter.className = 'results-counter';

            const filterContainer = document.querySelector('.category_list, .filter-controls');
            if (filterContainer) {
                filterContainer.parentNode.insertBefore(counter, filterContainer.nextSibling);
            }
        }

        const { totalItems, startIndex, endIndex } = pagination;
        counter.textContent = totalItems > 0
            ? `Mostrando ${startIndex}-${endIndex} de ${totalItems} resultados`
            : 'No hay resultados';
    }

    /**
     * Maneja la actualización de filtros
     * @param {Object} detail
     */
    handleFilterUpdate(detail) {
        console.log('[Grandiel Scan] Filtros actualizados:', detail.filters);
    }

    /**
     * Maneja el toggle de favoritos
     * @param {Object} detail
     */
    handleFavoriteToggle(detail) {
        console.log(`[Grandiel Scan] Favorito ${detail.action}: ${detail.mangaId}`);

        // Actualizar todos los botones de favorito para este manga
        const buttons = document.querySelectorAll(`[data-manga-id="${detail.mangaId}"]`);
        buttons.forEach(btn => {
            this.updateFavoriteButton(btn, detail.mangaId);
        });
    }

    /**
     * Actualiza el estado visual de un botón de favorito
     * @param {HTMLElement} button
     * @param {string} mangaId
     */
    updateFavoriteButton(button, mangaId) {
        const isFavorite = FavoritesStorage.isFavorite(mangaId);

        if (isFavorite) {
            button.classList.add('active');
            button.setAttribute('aria-label', 'Quitar de favoritos');
        } else {
            button.classList.remove('active');
            button.setAttribute('aria-label', 'Agregar a favoritos');
        }
    }

    /**
     * Configura la barra de progreso de lectura
     */
    setupReadingProgress() {
        let progressBar = document.getElementById('progress-bar');

        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.id = 'progress-bar';
            document.body.prepend(progressBar);
        }

        const updateProgress = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (scrollTop / docHeight) * 100;
            progressBar.style.width = `${Math.min(progress, 100)}%`;
        };

        window.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();
    }
}

// Crear instancia global
const app = new GrandielApp();

// Inicializar cuando el DOM esté listo
const initApp = () => {
    app.init();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Exponer API global para compatibilidad con código legacy
window.GrandielApp = {
    // Módulos
    Theme,
    Search,
    Filter,
    Navigation,

    // Storage
    Favorites: FavoritesStorage,
    History: HistoryStorage,

    // Estado
    getState,
    updateState,

    // Configuración
    CONFIG,

    // Métodos de la app
    init: () => app.init(),
    refresh: () => app.updateFilteredDisplay(Filter.getFilters())
};

// Exportar para uso con módulos ES6
export { Theme, Search, Filter, Navigation };
export default app;
