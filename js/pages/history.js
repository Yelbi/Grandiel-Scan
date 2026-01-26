/**
 * history.js - Pagina de Historial de Lectura
 * Grandiel Scan - Fase 6.1 Sistema de Usuarios
 *
 * Renderiza el historial de lectura del usuario.
 */

import { CONFIG, EVENTS } from '../config.js';
import { HistoryStorage, FavoritesStorage } from '../modules/storage.js';
import Search from '../modules/search.js';

/**
 * Clase HistoryPage - Gestiona la pagina de historial
 */
class HistoryPage {
    constructor() {
        this.container = null;
        this.countElement = null;
        this.emptyState = null;
        this.actionsElement = null;
        this.mangas = [];
    }

    /**
     * Inicializa la pagina
     */
    async init() {
        this.container = document.getElementById('history-list');
        this.countElement = document.getElementById('history-count');
        this.emptyState = document.getElementById('no-history');
        this.actionsElement = document.getElementById('history-actions');

        if (!this.container) return;

        // Cargar datos de mangas
        await this.loadMangas();

        // Renderizar historial
        this.render();

        // Configurar event listeners
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
        // Boton de limpiar historial
        const clearBtn = document.getElementById('clear-history-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Estas seguro de que quieres limpiar todo el historial?')) {
                    HistoryStorage.clear();
                    this.render();
                }
            });
        }

        // Actualizar cuando cambia el historial
        window.addEventListener(EVENTS.HISTORY_UPDATE, () => {
            this.render();
        });
    }

    /**
     * Renderiza la lista de historial
     */
    render() {
        const history = HistoryStorage.getAll();

        // Actualizar contador
        this.updateCount(history.length);

        // Mostrar estado vacio si no hay historial
        if (history.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();

        // Agrupar por fecha
        const grouped = this.groupByDate(history);

        // Generar HTML
        let html = '';
        for (const [date, entries] of Object.entries(grouped)) {
            html += `<div class="history-group">
                <h2 class="history-date">${date}</h2>
                <div class="history-entries">
                    ${entries.map(entry => this.renderHistoryEntry(entry)).join('')}
                </div>
            </div>`;
        }

        this.container.innerHTML = html;

        // Animar entrada
        this.animateEntries();
    }

    /**
     * Agrupa las entradas por fecha
     * @param {Array} history
     * @returns {Object}
     */
    groupByDate(history) {
        const groups = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        history.forEach(entry => {
            const entryDate = new Date(entry.timestamp);
            entryDate.setHours(0, 0, 0, 0);

            let dateLabel;
            if (entryDate.getTime() === today.getTime()) {
                dateLabel = 'Hoy';
            } else if (entryDate.getTime() === yesterday.getTime()) {
                dateLabel = 'Ayer';
            } else {
                dateLabel = entryDate.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                // Capitalizar primera letra
                dateLabel = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
            }

            if (!groups[dateLabel]) {
                groups[dateLabel] = [];
            }
            groups[dateLabel].push(entry);
        });

        return groups;
    }

    /**
     * Renderiza una entrada del historial
     * @param {Object} entry
     * @returns {string} HTML
     */
    renderHistoryEntry(entry) {
        const manga = this.mangas.find(m => m.id === entry.mangaId);
        const title = manga ? manga.title : entry.title || entry.mangaId;
        const image = manga ? manga.image : '/img/default-cover.jpg';
        const mangaUrl = `/manga.html?id=${entry.mangaId}`;
        const chapterUrl = `/chapter.html?manga=${entry.mangaId}&cap=${entry.chapter}`;
        const isFavorite = FavoritesStorage.isFavorite(entry.mangaId);
        const time = new Date(entry.timestamp).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="history-entry">
                <a href="${mangaUrl}" class="history-cover">
                    <img src="${image}" alt="${title}" loading="lazy">
                </a>
                <div class="history-info">
                    <h3><a href="${mangaUrl}">${title}</a></h3>
                    <p class="history-chapter">
                        <a href="${chapterUrl}">Capitulo ${entry.chapter}</a>
                    </p>
                    <span class="history-time">${time}</span>
                </div>
                <div class="history-actions">
                    <a href="${chapterUrl}" class="btn-continue" title="Continuar leyendo">
                        <i class="fas fa-play" aria-hidden="true"></i>
                    </a>
                    <button type="button"
                            class="btn-favorite ${isFavorite ? 'active' : ''}"
                            data-favorite-toggle
                            data-manga-id="${entry.mangaId}"
                            title="${isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
                        <i class="fas fa-heart" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Actualiza el contador de historial
     * @param {number} count
     */
    updateCount(count) {
        if (this.countElement) {
            this.countElement.textContent = count === 1
                ? '1 capitulo leido'
                : `${count} capitulos leidos`;
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
        if (this.actionsElement) {
            this.actionsElement.style.display = 'none';
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
        if (this.actionsElement) {
            this.actionsElement.style.display = '';
        }
    }

    /**
     * Anima las entradas de historial
     */
    animateEntries() {
        const entries = this.container.querySelectorAll('.history-entry');
        entries.forEach((entry, index) => {
            entry.style.opacity = '0';
            entry.style.transform = 'translateX(-20px)';

            setTimeout(() => {
                entry.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                entry.style.opacity = '1';
                entry.style.transform = 'translateX(0)';
            }, index * 30);
        });
    }
}

// Inicializar cuando el DOM este listo
const historyPage = new HistoryPage();

const initPage = () => {
    // Esperar a que la app principal este lista
    if (window.GrandielApp) {
        historyPage.init();
    } else {
        window.addEventListener('grandiel:ready', () => {
            historyPage.init();
        });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    initPage();
}

export default historyPage;
