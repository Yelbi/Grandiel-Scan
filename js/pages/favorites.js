/**
 * favorites.js - Pagina de Favoritos
 * Grandiel Scan - Fase 6.1 Sistema de Usuarios
 *
 * Renderiza la lista de favoritos del usuario.
 */

import { CONFIG, EVENTS, getState } from '../config.js';
import { FavoritesStorage } from '../modules/storage.js';
import Search from '../modules/search.js';

/**
 * Clase FavoritesPage - Gestiona la pagina de favoritos
 */
class FavoritesPage {
    constructor() {
        this.container = null;
        this.countElement = null;
        this.emptyState = null;
        this.mangas = [];
    }

    /**
     * Inicializa la pagina
     */
    async init() {
        this.container = document.getElementById('favorites-grid');
        this.countElement = document.getElementById('favorites-count');
        this.emptyState = document.getElementById('no-favorites');

        if (!this.container) return;

        // Cargar datos de mangas
        await this.loadMangas();

        // Renderizar favoritos
        this.render();

        // Escuchar cambios en favoritos
        this.setupEventListeners();
    }

    /**
     * Carga los datos de los mangas
     */
    async loadMangas() {
        try {
            this.mangas = await Search.loadMangas();
        } catch (error) {
            console.error('Error al cargar mangas:', error);
            this.mangas = [];
        }
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Actualizar cuando cambian los favoritos
        window.addEventListener(EVENTS.FAVORITE_TOGGLE, () => {
            this.render();
        });

        // Delegacion de eventos para botones de eliminar
        this.container.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.favorite-remove-btn');
            if (removeBtn) {
                e.preventDefault();
                const mangaId = removeBtn.dataset.mangaId;
                if (mangaId) {
                    FavoritesStorage.remove(mangaId);
                }
            }
        });
    }

    /**
     * Renderiza la lista de favoritos
     */
    render() {
        const favoriteIds = FavoritesStorage.getAll();
        const favoriteMangas = this.mangas.filter(m => favoriteIds.includes(m.id));

        // Actualizar contador
        this.updateCount(favoriteMangas.length);

        // Mostrar estado vacio si no hay favoritos
        if (favoriteMangas.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();

        // Ordenar por el orden en que fueron agregados (mas reciente primero)
        const sortedMangas = favoriteIds
            .map(id => favoriteMangas.find(m => m.id === id))
            .filter(Boolean);

        // Generar HTML
        const html = sortedMangas.map((manga, index) => this.renderMangaCard(manga, index)).join('');
        this.container.innerHTML = html;

        // Animar entrada
        this.animateCards();
    }

    /**
     * Renderiza una tarjeta de manga
     * @param {Object} manga
     * @param {number} index
     * @returns {string} HTML
     */
    renderMangaCard(manga, index) {
        const url = `/manga.html?id=${manga.id}`;
        const chaptersCount = manga.chapters?.length || 0;

        return `
            <li class="manga-card favorite-card" data-index="${index}">
                <a href="${url}">
                    <img src="${manga.image}" alt="${manga.title}" loading="lazy" width="230" height="350">
                </a>
                <div class="manga-card-info">
                    <h3><a href="${url}">${manga.title}</a></h3>
                    <div class="manga-meta">
                        <span class="manga-type">${manga.type || 'Manhwa'}</span>
                        <span class="manga-chapters">${chaptersCount} caps</span>
                    </div>
                </div>
                <button type="button"
                        class="favorite-remove-btn"
                        data-manga-id="${manga.id}"
                        aria-label="Eliminar ${manga.title} de favoritos"
                        title="Eliminar de favoritos">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </li>
        `;
    }

    /**
     * Actualiza el contador de favoritos
     * @param {number} count
     */
    updateCount(count) {
        if (this.countElement) {
            this.countElement.textContent = count === 1
                ? '1 manga en tu lista'
                : `${count} mangas en tu lista`;
        }
    }

    /**
     * Muestra el estado vacio
     */
    showEmptyState() {
        if (this.emptyState) {
            this.emptyState.style.display = 'block';
        }
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * Oculta el estado vacio
     */
    hideEmptyState() {
        if (this.emptyState) {
            this.emptyState.style.display = 'none';
        }
        if (this.container) {
            this.container.style.display = '';
        }
    }

    /**
     * Anima las tarjetas de entrada
     */
    animateCards() {
        const cards = this.container.querySelectorAll('.favorite-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';

            setTimeout(() => {
                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }
}

// Inicializar cuando el DOM este listo
const favoritesPage = new FavoritesPage();

const initPage = () => {
    // Esperar a que la app principal este lista
    if (window.GrandielApp) {
        favoritesPage.init();
    } else {
        window.addEventListener('grandiel:ready', () => {
            favoritesPage.init();
        });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    initPage();
}

export default favoritesPage;
