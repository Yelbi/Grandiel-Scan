/**
 * user.js - Sistema de Usuario
 * Grandiel Scan - Fase 6.1 Sistema de Usuarios
 *
 * Maneja la interfaz de usuario para registro, login y perfil.
 */

import { CONFIG, EVENTS } from '../config.js';
import { UserProfileStorage, FavoritesStorage, HistoryStorage, ReadingModeStorage } from './storage.js';

/**
 * Clase UserUI - Gestiona la interfaz de usuario
 */
class UserUI {
    constructor() {
        this.modalContainer = null;
        this.isInitialized = false;
    }

    /**
     * Inicializa el sistema de usuario
     */
    init() {
        if (this.isInitialized) return;

        this.createModalContainer();
        this.createUserButton();
        this.setupEventListeners();
        this.updateUserDisplay();

        this.isInitialized = true;
    }

    /**
     * Crea el contenedor del modal
     */
    createModalContainer() {
        this.modalContainer = document.createElement('div');
        this.modalContainer.id = 'user-modal-container';
        this.modalContainer.innerHTML = `
            <div class="user-modal-overlay" id="user-modal-overlay"></div>
            <div class="user-modal" id="user-modal" role="dialog" aria-labelledby="modal-title" aria-modal="true">
                <button class="user-modal-close" id="modal-close" aria-label="Cerrar">&times;</button>
                <div class="user-modal-content" id="modal-content">
                    <!-- Contenido dinamico -->
                </div>
            </div>
        `;
        document.body.appendChild(this.modalContainer);
    }

    /**
     * Crea el boton de usuario en la navegacion
     */
    createUserButton() {
        const nav = document.querySelector('nav .list') || document.querySelector('nav ul');
        if (!nav) return;

        const userLi = document.createElement('li');
        userLi.className = 'user-nav-item';
        userLi.innerHTML = `
            <button type="button" id="user-nav-btn" class="user-nav-btn" aria-label="Menu de usuario">
                <img src="${UserProfileStorage.getAvatar()}" alt="Avatar" class="user-avatar-small" id="nav-user-avatar">
                <span id="nav-user-name">${UserProfileStorage.getDisplayName()}</span>
            </button>
        `;
        nav.appendChild(userLi);
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Boton de usuario en nav
        const userBtn = document.getElementById('user-nav-btn');
        if (userBtn) {
            userBtn.addEventListener('click', () => this.handleUserButtonClick());
        }

        // Cerrar modal
        const closeBtn = document.getElementById('modal-close');
        const overlay = document.getElementById('user-modal-overlay');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (overlay) {
            overlay.addEventListener('click', () => this.closeModal());
        }

        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen()) {
                this.closeModal();
            }
        });

        // Escuchar cambios en perfil
        window.addEventListener(EVENTS.USER_PROFILE_CHANGE, () => {
            this.updateUserDisplay();
        });
    }

    /**
     * Maneja click en boton de usuario
     */
    handleUserButtonClick() {
        if (UserProfileStorage.isLoggedIn()) {
            this.showProfileMenu();
        } else {
            this.showLoginForm();
        }
    }

    /**
     * Muestra el formulario de login/registro
     */
    showLoginForm() {
        const content = document.getElementById('modal-content');
        if (!content) return;

        content.innerHTML = `
            <h2 id="modal-title" class="user-modal-title">Bienvenido a Grandiel Scan</h2>
            <p class="user-modal-subtitle">Crea una cuenta para guardar tus favoritos y tu progreso de lectura.</p>

            <form id="user-register-form" class="user-form">
                <div class="form-group">
                    <label for="username-input">Nombre de usuario</label>
                    <input
                        type="text"
                        id="username-input"
                        name="username"
                        placeholder="Tu nombre de usuario"
                        minlength="3"
                        maxlength="20"
                        required
                        autocomplete="username"
                    >
                    <span class="form-hint">3-20 caracteres</span>
                </div>

                <div class="form-group">
                    <label for="avatar-select">Avatar</label>
                    <div class="avatar-selector" id="avatar-selector">
                        <button type="button" class="avatar-option selected" data-avatar="/img/avatars/avatar1.svg">
                            <img src="/img/avatars/avatar1.svg" alt="Avatar 1">
                        </button>
                        <button type="button" class="avatar-option" data-avatar="/img/avatars/avatar2.svg">
                            <img src="/img/avatars/avatar2.svg" alt="Avatar 2">
                        </button>
                        <button type="button" class="avatar-option" data-avatar="/img/avatars/avatar3.svg">
                            <img src="/img/avatars/avatar3.svg" alt="Avatar 3">
                        </button>
                        <button type="button" class="avatar-option" data-avatar="/img/avatars/avatar4.svg">
                            <img src="/img/avatars/avatar4.svg" alt="Avatar 4">
                        </button>
                    </div>
                </div>

                <button type="submit" class="btn-primary user-submit-btn">Crear Cuenta</button>
            </form>

            <p class="user-modal-note">
                <small>Los datos se guardan localmente en tu navegador. No se requiere email ni contrasena.</small>
            </p>
        `;

        this.openModal();
        this.setupFormListeners();
    }

    /**
     * Muestra el menu de perfil
     */
    showProfileMenu() {
        const content = document.getElementById('modal-content');
        const profile = UserProfileStorage.get();
        if (!content || !profile) return;

        const favorites = FavoritesStorage.getAll();
        const history = HistoryStorage.getAll();
        const readingMode = ReadingModeStorage.get();

        content.innerHTML = `
            <div class="user-profile-header">
                <img src="${profile.avatar}" alt="Avatar" class="user-avatar-large">
                <h2 id="modal-title" class="user-profile-name">${profile.username}</h2>
                <p class="user-profile-since">Usuario desde ${this.formatDate(profile.createdAt)}</p>
            </div>

            <div class="user-stats">
                <div class="user-stat">
                    <span class="stat-number">${favorites.length}</span>
                    <span class="stat-label">Favoritos</span>
                </div>
                <div class="user-stat">
                    <span class="stat-number">${history.length}</span>
                    <span class="stat-label">Leidos</span>
                </div>
            </div>

            <nav class="user-menu">
                <a href="/Favoritos.html" class="user-menu-item">
                    <i class="fas fa-heart" aria-hidden="true"></i>
                    Mis Favoritos
                </a>
                <a href="/Historial.html" class="user-menu-item">
                    <i class="fas fa-history" aria-hidden="true"></i>
                    Historial de Lectura
                </a>
                <button type="button" class="user-menu-item" id="toggle-reading-mode">
                    <i class="fas fa-book-reader" aria-hidden="true"></i>
                    Modo: ${readingMode === 'continuous' ? 'Continuo' : 'Paginado'}
                </button>
                <button type="button" class="user-menu-item" id="edit-profile-btn">
                    <i class="fas fa-edit" aria-hidden="true"></i>
                    Editar Perfil
                </button>
            </nav>

            <button type="button" class="btn-secondary user-logout-btn" id="logout-btn">
                <i class="fas fa-sign-out-alt" aria-hidden="true"></i>
                Cerrar Sesion
            </button>
        `;

        this.openModal();
        this.setupProfileListeners();
    }

    /**
     * Muestra el formulario de edicion de perfil
     */
    showEditProfileForm() {
        const content = document.getElementById('modal-content');
        const profile = UserProfileStorage.get();
        if (!content || !profile) return;

        content.innerHTML = `
            <h2 id="modal-title" class="user-modal-title">Editar Perfil</h2>

            <form id="user-edit-form" class="user-form">
                <div class="form-group">
                    <label for="edit-username-input">Nombre de usuario</label>
                    <input
                        type="text"
                        id="edit-username-input"
                        name="username"
                        value="${profile.username}"
                        minlength="3"
                        maxlength="20"
                        required
                    >
                </div>

                <div class="form-group">
                    <label>Avatar</label>
                    <div class="avatar-selector" id="avatar-selector">
                        <button type="button" class="avatar-option ${profile.avatar.includes('avatar1') ? 'selected' : ''}" data-avatar="/img/avatars/avatar1.svg">
                            <img src="/img/avatars/avatar1.svg" alt="Avatar 1">
                        </button>
                        <button type="button" class="avatar-option ${profile.avatar.includes('avatar2') ? 'selected' : ''}" data-avatar="/img/avatars/avatar2.svg">
                            <img src="/img/avatars/avatar2.svg" alt="Avatar 2">
                        </button>
                        <button type="button" class="avatar-option ${profile.avatar.includes('avatar3') ? 'selected' : ''}" data-avatar="/img/avatars/avatar3.svg">
                            <img src="/img/avatars/avatar3.svg" alt="Avatar 3">
                        </button>
                        <button type="button" class="avatar-option ${profile.avatar.includes('avatar4') ? 'selected' : ''}" data-avatar="/img/avatars/avatar4.svg">
                            <img src="/img/avatars/avatar4.svg" alt="Avatar 4">
                        </button>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn-secondary" id="cancel-edit-btn">Cancelar</button>
                    <button type="submit" class="btn-primary">Guardar Cambios</button>
                </div>
            </form>
        `;

        this.setupEditFormListeners();
    }

    /**
     * Configura listeners del formulario de registro
     */
    setupFormListeners() {
        const form = document.getElementById('user-register-form');
        const avatarSelector = document.getElementById('avatar-selector');

        if (avatarSelector) {
            avatarSelector.addEventListener('click', (e) => {
                const option = e.target.closest('.avatar-option');
                if (option) {
                    avatarSelector.querySelectorAll('.avatar-option').forEach(btn => {
                        btn.classList.remove('selected');
                    });
                    option.classList.add('selected');
                }
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('username-input').value.trim();
                const selectedAvatar = avatarSelector.querySelector('.avatar-option.selected');
                const avatar = selectedAvatar ? selectedAvatar.dataset.avatar : '/img/avatars/avatar1.svg';

                if (username.length >= 3) {
                    UserProfileStorage.create({ username, avatar });
                    this.closeModal();
                    this.showWelcomeMessage(username);
                }
            });
        }
    }

    /**
     * Configura listeners del perfil
     */
    setupProfileListeners() {
        const logoutBtn = document.getElementById('logout-btn');
        const editBtn = document.getElementById('edit-profile-btn');
        const readingModeBtn = document.getElementById('toggle-reading-mode');

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                UserProfileStorage.logout();
                this.closeModal();
            });
        }

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.showEditProfileForm();
            });
        }

        if (readingModeBtn) {
            readingModeBtn.addEventListener('click', () => {
                const newMode = ReadingModeStorage.toggle();
                const icon = readingModeBtn.querySelector('i');
                readingModeBtn.innerHTML = `
                    <i class="fas fa-book-reader" aria-hidden="true"></i>
                    Modo: ${newMode === 'continuous' ? 'Continuo' : 'Paginado'}
                `;
            });
        }
    }

    /**
     * Configura listeners del formulario de edicion
     */
    setupEditFormListeners() {
        const form = document.getElementById('user-edit-form');
        const cancelBtn = document.getElementById('cancel-edit-btn');
        const avatarSelector = document.getElementById('avatar-selector');

        if (avatarSelector) {
            avatarSelector.addEventListener('click', (e) => {
                const option = e.target.closest('.avatar-option');
                if (option) {
                    avatarSelector.querySelectorAll('.avatar-option').forEach(btn => {
                        btn.classList.remove('selected');
                    });
                    option.classList.add('selected');
                }
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.showProfileMenu();
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('edit-username-input').value.trim();
                const selectedAvatar = avatarSelector.querySelector('.avatar-option.selected');
                const avatar = selectedAvatar ? selectedAvatar.dataset.avatar : UserProfileStorage.getAvatar();

                if (username.length >= 3) {
                    UserProfileStorage.update({ username, avatar });
                    this.showProfileMenu();
                }
            });
        }
    }

    /**
     * Actualiza la visualizacion del usuario en la navegacion
     */
    updateUserDisplay() {
        const avatar = document.getElementById('nav-user-avatar');
        const name = document.getElementById('nav-user-name');

        if (avatar) {
            avatar.src = UserProfileStorage.getAvatar();
        }

        if (name) {
            name.textContent = UserProfileStorage.getDisplayName();
        }
    }

    /**
     * Muestra mensaje de bienvenida
     */
    showWelcomeMessage(username) {
        const toast = document.createElement('div');
        toast.className = 'user-toast';
        toast.innerHTML = `
            <i class="fas fa-check-circle" aria-hidden="true"></i>
            <span>Bienvenido, ${username}!</span>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Abre el modal
     */
    openModal() {
        const modal = document.getElementById('user-modal');
        const overlay = document.getElementById('user-modal-overlay');

        if (modal && overlay) {
            overlay.classList.add('active');
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Focus en el primer input
            const firstInput = modal.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    /**
     * Cierra el modal
     */
    closeModal() {
        const modal = document.getElementById('user-modal');
        const overlay = document.getElementById('user-modal-overlay');

        if (modal && overlay) {
            modal.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    /**
     * Verifica si el modal esta abierto
     */
    isModalOpen() {
        const modal = document.getElementById('user-modal');
        return modal && modal.classList.contains('active');
    }

    /**
     * Formatea una fecha
     */
    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Instancia singleton
const userUI = new UserUI();

/**
 * Inicializa el sistema de usuario
 */
export const initUserSystem = () => {
    userUI.init();
};

/**
 * Abre el menu de usuario
 */
export const openUserMenu = () => {
    userUI.handleUserButtonClick();
};

export default userUI;
