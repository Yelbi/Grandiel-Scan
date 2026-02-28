/**
 * notifications.js - Sistema de Notificaciones
 * Grandiel Scan - Fase 6.2 Características Avanzadas
 *
 * Gestiona notificaciones de nuevos capítulos y badges.
 */

import { CONFIG, EVENTS, getState } from '../config.js';
import { SeenChaptersStorage, FavoritesStorage } from './storage.js';

/**
 * Clase Notifications - Gestiona el sistema de notificaciones
 */
class Notifications {
    constructor() {
        this.isInitialized = false;
        this.notificationCenter = null;
    }

    /**
     * Inicializa el sistema de notificaciones
     */
    init() {
        if (this.isInitialized) return;

        this.createNotificationBell();
        this.updateAllBadges();
        this.setupEventListeners();

        this.isInitialized = true;
    }

    /**
     * Crea el icono de campana de notificaciones
     */
    createNotificationBell() {
        const nav = document.querySelector('nav .list') || document.querySelector('nav ul');
        if (!nav) return;

        // Verificar si ya existe
        if (document.getElementById('notification-bell')) return;

        const bellLi = document.createElement('li');
        bellLi.className = 'notification-nav-item';
        bellLi.innerHTML = `
            <button type="button" id="notification-bell" class="notification-bell" aria-label="Notificaciones">
                <i class="fas fa-bell" aria-hidden="true"></i>
                <span class="notification-badge" id="notification-badge" style="display: none;">0</span>
            </button>
        `;

        // Insertar antes del último elemento (que debería ser el botón de usuario)
        const userNavItem = nav.querySelector('.user-nav-item');
        if (userNavItem) {
            nav.insertBefore(bellLi, userNavItem);
        } else {
            nav.appendChild(bellLi);
        }

        // Crear el panel de notificaciones
        this.createNotificationPanel();
    }

    /**
     * Crea el panel de notificaciones
     */
    createNotificationPanel() {
        this.notificationCenter = document.createElement('div');
        this.notificationCenter.id = 'notification-center';
        this.notificationCenter.className = 'notification-center';
        this.notificationCenter.innerHTML = `
            <div class="notification-header">
                <h3>Notificaciones</h3>
                <button type="button" id="mark-all-read" class="mark-all-read" title="Marcar todo como leído">
                    <i class="fas fa-check-double" aria-hidden="true"></i>
                </button>
            </div>
            <div class="notification-list" id="notification-list">
                <!-- Se llena dinámicamente -->
            </div>
        `;
        document.body.appendChild(this.notificationCenter);
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Toggle del panel de notificaciones
        const bell = document.getElementById('notification-bell');
        if (bell) {
            bell.addEventListener('click', () => this.togglePanel());
        }

        // Cerrar panel al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (this.notificationCenter &&
                !this.notificationCenter.contains(e.target) &&
                !e.target.closest('#notification-bell')) {
                this.closePanel();
            }
        });

        // Marcar todo como leído
        const markAllBtn = document.getElementById('mark-all-read');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', () => this.markAllAsRead());
        }

        // Escuchar cuando se carga la data
        window.addEventListener(EVENTS.DATA_LOADED, () => this.updateAllBadges());

        // Escuchar cambios en favoritos
        window.addEventListener(EVENTS.FAVORITE_TOGGLE, () => {
            this.updateAllBadges();
            this.updateNotificationList();
        });
    }

    /**
     * Toggle del panel de notificaciones
     */
    togglePanel() {
        if (this.notificationCenter.classList.contains('active')) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }

    /**
     * Abre el panel de notificaciones
     */
    openPanel() {
        this.updateNotificationList();
        this.notificationCenter.classList.add('active');
    }

    /**
     * Cierra el panel de notificaciones
     */
    closePanel() {
        this.notificationCenter.classList.remove('active');
    }

    /**
     * Actualiza la lista de notificaciones
     */
    updateNotificationList() {
        const list = document.getElementById('notification-list');
        if (!list) return;

        const notifications = this.getNotifications();

        if (notifications.length === 0) {
            list.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-bell-slash" aria-hidden="true"></i>
                    <p>No hay notificaciones</p>
                </div>
            `;
            return;
        }

        list.innerHTML = notifications.map(n => this.renderNotification(n)).join('');

        // Event listeners para las notificaciones
        list.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.notification-dismiss')) {
                    const mangaId = item.dataset.mangaId;
                    this.markMangaAsRead(mangaId);
                    window.location.href = `/manga.html?id=${mangaId}`;
                }
            });
        });

        // Botones de descartar
        list.querySelectorAll('.notification-dismiss').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const mangaId = btn.dataset.mangaId;
                this.markMangaAsRead(mangaId);
                this.updateNotificationList();
                this.updateAllBadges();
            });
        });
    }

    /**
     * Renderiza una notificación individual
     */
    renderNotification(notification) {
        return `
            <div class="notification-item" data-manga-id="${notification.mangaId}">
                <img src="${notification.image}" alt="${notification.title}" class="notification-image" onerror="this.src='/img/logo.jpg'">
                <div class="notification-content">
                    <h4 class="notification-title">${notification.title}</h4>
                    <p class="notification-text">
                        ${notification.unseenCount === 1
                            ? '1 capítulo nuevo'
                            : `${notification.unseenCount} capítulos nuevos`
                        }
                    </p>
                </div>
                <button type="button" class="notification-dismiss" data-manga-id="${notification.mangaId}" title="Marcar como leído">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
        `;
    }

    /**
     * Obtiene las notificaciones pendientes
     */
    getNotifications() {
        const mangas = getState('mangas') || [];
        const favorites = FavoritesStorage.getAll();
        const notifications = [];

        // Solo mostrar notificaciones de favoritos
        favorites.forEach(mangaId => {
            const manga = mangas.find(m => m.id === mangaId);
            if (!manga || !manga.chapters) return;

            const unseenChapters = SeenChaptersStorage.getUnseen(mangaId, manga.chapters);

            if (unseenChapters.length > 0) {
                notifications.push({
                    mangaId: manga.id,
                    title: manga.title,
                    image: manga.image,
                    unseenCount: unseenChapters.length,
                    unseenChapters: unseenChapters
                });
            }
        });

        return notifications;
    }

    /**
     * Actualiza todos los badges de notificación
     */
    updateAllBadges() {
        const notifications = this.getNotifications();
        const totalUnseen = notifications.reduce((sum, n) => sum + n.unseenCount, 0);

        // Actualizar badge principal
        const badge = document.getElementById('notification-badge');
        if (badge) {
            if (totalUnseen > 0) {
                badge.textContent = totalUnseen > 99 ? '99+' : totalUnseen;
                badge.style.display = '';
            } else {
                badge.style.display = 'none';
            }
        }

        // Actualizar badges en tarjetas de manga
        this.updateMangaCardBadges(notifications);
    }

    /**
     * Actualiza los badges en las tarjetas de manga
     */
    updateMangaCardBadges(notifications) {
        // Buscar todas las tarjetas de manga
        const mangaCards = document.querySelectorAll('.manga-card, .product-item');

        mangaCards.forEach(card => {
            const link = card.querySelector('a[href*="manga.html"]');
            if (!link) return;

            const href = link.getAttribute('href');
            const match = href.match(/[?&]id=([^&]+)/);
            if (!match) return;

            const mangaId = match[1];
            const notification = notifications.find(n => n.mangaId === mangaId);

            // Buscar o crear badge
            let badge = card.querySelector('.manga-new-badge');

            if (notification && notification.unseenCount > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'manga-new-badge';
                    card.style.position = 'relative';
                    card.appendChild(badge);
                }
                badge.textContent = notification.unseenCount > 9 ? '9+' : notification.unseenCount;
                badge.title = `${notification.unseenCount} capítulo${notification.unseenCount > 1 ? 's' : ''} nuevo${notification.unseenCount > 1 ? 's' : ''}`;
            } else if (badge) {
                badge.remove();
            }
        });
    }

    /**
     * Marca un manga como leído (todos sus capítulos vistos)
     */
    markMangaAsRead(mangaId) {
        const mangas = getState('mangas') || [];
        const manga = mangas.find(m => m.id === mangaId);

        if (manga && manga.chapters) {
            SeenChaptersStorage.markAllSeen(mangaId, manga.chapters);
            this.updateAllBadges();
        }
    }

    /**
     * Marca todo como leído
     */
    markAllAsRead() {
        const mangas = getState('mangas') || [];
        const favorites = FavoritesStorage.getAll();

        favorites.forEach(mangaId => {
            const manga = mangas.find(m => m.id === mangaId);
            if (manga && manga.chapters) {
                SeenChaptersStorage.markAllSeen(mangaId, manga.chapters);
            }
        });

        this.updateAllBadges();
        this.updateNotificationList();
    }

    /**
     * Marca un capítulo específico como visto
     */
    markChapterSeen(mangaId, chapter) {
        SeenChaptersStorage.markSeen(mangaId, chapter);
        this.updateAllBadges();
    }
}

// Instancia singleton
const notificationsInstance = new Notifications();

/**
 * Inicializa el sistema de notificaciones
 */
export const initNotifications = () => {
    notificationsInstance.init();
};

/**
 * Marca un capítulo como visto
 */
export const markChapterSeen = (mangaId, chapter) => {
    notificationsInstance.markChapterSeen(mangaId, chapter);
};

export default notificationsInstance;
