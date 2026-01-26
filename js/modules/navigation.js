/**
 * navigation.js - Componentes de Navegación
 * Grandiel Scan - Fase 3 Refactorización JavaScript
 *
 * Gestiona la navegación principal, breadcrumbs,
 * y componentes de navegación de capítulos.
 */

import { CONFIG, getState } from '../config.js';
import { HistoryStorage, FavoritesStorage } from './storage.js';

const { PAGES, MANGAS_JSON } = CONFIG;

/**
 * Clase NavigationManager - Gestiona la navegación
 */
class NavigationManager {
    constructor() {
        this.mangas = [];
        this.isLoaded = false;
    }

    /**
     * Carga los datos de mangas
     * @returns {Promise<Array>}
     */
    async loadMangas() {
        const stateMangas = getState('mangas');
        if (stateMangas?.length > 0) {
            this.mangas = stateMangas;
            this.isLoaded = true;
            return this.mangas;
        }

        try {
            const response = await fetch(MANGAS_JSON);
            const data = await response.json();
            this.mangas = data.mangas || [];
            this.isLoaded = true;
            return this.mangas;
        } catch (error) {
            console.error('Error al cargar mangas:', error);
            return [];
        }
    }

    /**
     * Genera el HTML de la navegación principal
     * @param {string} currentPage - Página actual para marcar como activa
     * @returns {string}
     */
    generateNavigationHTML(currentPage = '') {
        return `
        <nav role="navigation" aria-label="Navegación principal" class="alpha">
            <div class="logo">
                <a href="${PAGES.HOME}" aria-label="Ir a inicio">
                    <img src="/img/logo.gif" alt="Grandiel Scan Logo" width="50" height="50">
                </a>
            </div>
            <ul class="list">
                <li>
                    <a href="${PAGES.MANGAS}" ${currentPage === 'mangas' ? 'aria-current="page"' : ''}>
                        <span>Mangas</span>
                    </a>
                </li>
                <li>
                    <a href="${PAGES.UPDATES}" ${currentPage === 'actualizaciones' ? 'aria-current="page"' : ''}>
                        <span>Actualizaciones</span>
                    </a>
                </li>
                <li>
                    <a href="${PAGES.NEW}" ${currentPage === 'nuevos' ? 'aria-current="page"' : ''}>
                        <span>Nuevos</span>
                    </a>
                </li>
            </ul>

            <div id="ctn-bars-search">
                <input type="text" id="inputSearch" placeholder="¿Qué deseas buscar?" aria-label="Buscador de manhwas">
                <div id="ctn-icon-search" class="btn" role="button" aria-label="Botón de búsqueda" tabindex="0">
                    <i class="fas fa-search" id="icon-search" aria-hidden="true"></i>
                </div>
                <ul id="box-search" role="listbox" aria-label="Resultados de búsqueda"></ul>
            </div>
            <div id="cover-ctn-search"></div>
        </nav>
        `;
    }

    /**
     * Genera breadcrumbs para una página
     * @param {Array} items - Array de {label, url} para los breadcrumbs
     * @returns {string}
     */
    generateBreadcrumbsHTML(items) {
        if (!items || items.length === 0) return '';

        const breadcrumbItems = items.map((item, index) => {
            const isLast = index === items.length - 1;

            if (isLast) {
                return `
                    <li>
                        <span aria-current="page">${item.label}</span>
                    </li>
                `;
            }

            return `
                <li>
                    <a href="${item.url}">${item.label}</a>
                </li>
            `;
        }).join('');

        // Schema.org JSON-LD para breadcrumbs
        const schemaItems = items.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.label,
            "item": item.url ? `${window.location.origin}${item.url}` : undefined
        }));

        const schemaJSON = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": schemaItems
        });

        return `
            <nav class="breadcrumbs" aria-label="Breadcrumb">
                <ol>
                    ${breadcrumbItems}
                </ol>
            </nav>
            <script type="application/ld+json">${schemaJSON}</script>
        `;
    }

    /**
     * Genera navegación de capítulos
     * @param {Object} options
     * @returns {string}
     */
    generateChapterNavHTML(options) {
        const { mangaId, currentChapter, totalChapters, mangaTitle } = options;

        const prevChapter = currentChapter > 1 ? currentChapter - 1 : null;
        const nextChapter = currentChapter < totalChapters ? currentChapter + 1 : null;

        const prevUrl = prevChapter
            ? `/chapter.html?manga=${mangaId}&cap=${prevChapter}`
            : '#';
        const nextUrl = nextChapter
            ? `/chapter.html?manga=${mangaId}&cap=${nextChapter}`
            : '#';

        return `
            <div class="chapter-navigation" aria-label="Navegación de capítulos">
                <a href="${prevUrl}"
                   class="chapter-nav-btn prev ${!prevChapter ? 'chapter-nav-disabled' : ''}"
                   ${!prevChapter ? 'aria-disabled="true"' : ''}
                   title="Capítulo anterior">
                    <i class="fas fa-chevron-left" aria-hidden="true"></i>
                    <span>Anterior</span>
                </a>

                <a href="/manga.html?id=${mangaId}" class="chapter-nav-btn home" title="Volver a ${mangaTitle}">
                    <i class="fas fa-home" aria-hidden="true"></i>
                </a>

                <a href="${nextUrl}"
                   class="chapter-nav-btn next ${!nextChapter ? 'chapter-nav-disabled' : ''}"
                   ${!nextChapter ? 'aria-disabled="true"' : ''}
                   title="Capítulo siguiente">
                    <span>Siguiente</span>
                    <i class="fas fa-chevron-right" aria-hidden="true"></i>
                </a>
            </div>
        `;
    }

    /**
     * Genera selector de capítulos
     * @param {Object} options
     * @returns {string}
     */
    generateChapterSelectorHTML(options) {
        const { mangaId, currentChapter, chapters } = options;

        if (!chapters || chapters.length === 0) return '';

        const options_html = chapters.map(cap => `
            <option value="${cap}" ${cap === currentChapter ? 'selected' : ''}>
                Capítulo ${cap}
            </option>
        `).join('');

        return `
            <div class="chapter-selector">
                <select id="chapter-select" aria-label="Seleccionar capítulo" data-manga-id="${mangaId}">
                    ${options_html}
                </select>
            </div>
        `;
    }

    /**
     * Genera lista de capítulos para página de manga
     * @param {Object} options
     * @returns {string}
     */
    generateChapterListHTML(options) {
        const { mangaId, chapters, readChapters = [] } = options;

        if (!chapters || chapters.length === 0) {
            return `<p class="no-chapters">No hay capítulos disponibles</p>`;
        }

        const chapterItems = chapters.map(cap => {
            const isRead = readChapters.includes(cap);
            const url = `/chapter.html?manga=${mangaId}&cap=${cap}`;

            return `
                <li class="cap ${isRead ? 'read' : ''}">
                    <a href="${url}" data-chapter="${cap}">
                        Capítulo ${cap}
                    </a>
                </li>
            `;
        }).join('');

        return `
            <ul class="capitulos" aria-label="Lista de capítulos">
                ${chapterItems}
            </ul>
        `;
    }

    /**
     * Genera sección de continuar leyendo
     * @returns {string}
     */
    generateContinueReadingHTML() {
        const history = HistoryStorage.getAll();

        if (history.length === 0) return '';

        const recentItems = history.slice(0, 5).map(item => `
            <li class="continue-item">
                <a href="/chapter.html?manga=${item.mangaId}&cap=${item.chapter}">
                    <span class="continue-title">${item.title || item.mangaId}</span>
                    <span class="continue-chapter">Cap. ${item.chapter}</span>
                </a>
            </li>
        `).join('');

        return `
            <section class="continue-reading">
                <h3>Continuar Leyendo</h3>
                <ul class="continue-list">
                    ${recentItems}
                </ul>
            </section>
        `;
    }

    /**
     * Genera sección de favoritos
     * @returns {Promise<string>}
     */
    async generateFavoritesHTML() {
        const favoriteIds = FavoritesStorage.getAll();

        if (favoriteIds.length === 0) return '';

        if (!this.isLoaded) {
            await this.loadMangas();
        }

        const favoriteMangas = this.mangas.filter(m => favoriteIds.includes(m.id));

        if (favoriteMangas.length === 0) return '';

        const items = favoriteMangas.slice(0, 6).map(manga => `
            <li class="favorite-item">
                <a href="/manga.html?id=${manga.id}">
                    <img src="${manga.image}" alt="${manga.title}" loading="lazy">
                    <span class="favorite-title">${manga.title}</span>
                </a>
            </li>
        `).join('');

        return `
            <section class="favorites-section">
                <h3>Mis Favoritos</h3>
                <ul class="favorites-list">
                    ${items}
                </ul>
            </section>
        `;
    }

    /**
     * Inicializa la navegación de capítulos con eventos
     */
    initChapterNavigation() {
        // Selector de capítulos
        const chapterSelect = document.getElementById('chapter-select');
        if (chapterSelect) {
            chapterSelect.addEventListener('change', (e) => {
                const mangaId = e.target.dataset.mangaId;
                const chapter = e.target.value;
                window.location.href = `/chapter.html?manga=${mangaId}&cap=${chapter}`;
            });
        }

        // Atajos de teclado para navegación
        document.addEventListener('keydown', (e) => {
            // Solo en páginas de capítulo
            if (!window.location.pathname.includes('chapter.html')) return;

            const prevBtn = document.querySelector('.chapter-nav-btn.prev:not(.chapter-nav-disabled)');
            const nextBtn = document.querySelector('.chapter-nav-btn.next:not(.chapter-nav-disabled)');

            switch (e.key) {
                case 'ArrowLeft':
                    if (prevBtn && !e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        prevBtn.click();
                    }
                    break;

                case 'ArrowRight':
                    if (nextBtn && !e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        nextBtn.click();
                    }
                    break;
            }
        });
    }

    /**
     * Marca capítulos como leídos en el historial
     * @param {string} mangaId
     * @returns {Array} IDs de capítulos leídos
     */
    getReadChapters(mangaId) {
        const history = HistoryStorage.getAll();
        return history
            .filter(h => h.mangaId === mangaId)
            .map(h => h.chapter);
    }
}

// Instancia singleton
const navigationManager = new NavigationManager();

/**
 * Inicializa la navegación
 */
const initNavigation = () => {
    navigationManager.initChapterNavigation();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
} else {
    initNavigation();
}

// API pública
export const Navigation = {
    generateNavigationHTML: (currentPage) => navigationManager.generateNavigationHTML(currentPage),
    generateBreadcrumbsHTML: (items) => navigationManager.generateBreadcrumbsHTML(items),
    generateChapterNavHTML: (options) => navigationManager.generateChapterNavHTML(options),
    generateChapterSelectorHTML: (options) => navigationManager.generateChapterSelectorHTML(options),
    generateChapterListHTML: (options) => navigationManager.generateChapterListHTML(options),
    generateContinueReadingHTML: () => navigationManager.generateContinueReadingHTML(),
    generateFavoritesHTML: () => navigationManager.generateFavoritesHTML(),
    getReadChapters: (mangaId) => navigationManager.getReadChapters(mangaId),
    loadMangas: () => navigationManager.loadMangas()
};

export default Navigation;
