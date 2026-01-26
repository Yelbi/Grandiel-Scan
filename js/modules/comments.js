/**
 * comments.js - Sistema de Comentarios
 * Grandiel Scan - Fase 6.2 Características Avanzadas
 *
 * Maneja la UI de comentarios en páginas de manga y capítulos.
 */

import { EVENTS } from '../config.js';
import { CommentsStorage, UserProfileStorage } from './storage.js';

/**
 * Clase Comments - Gestiona la UI de comentarios
 */
class Comments {
    constructor() {
        this.container = null;
        this.mangaId = null;
        this.chapter = null;
        this.isInitialized = false;
    }

    /**
     * Inicializa el sistema de comentarios
     * @param {string} mangaId
     * @param {number|null} chapter - null para comentarios de manga, número para capítulo
     */
    init(mangaId, chapter = null) {
        this.mangaId = mangaId;
        this.chapter = chapter;

        this.createContainer();
        this.render();
        this.setupEventListeners();

        this.isInitialized = true;
    }

    /**
     * Crea el contenedor de comentarios
     */
    createContainer() {
        // Buscar contenedor existente o crear uno
        this.container = document.getElementById('comments-section');

        if (!this.container) {
            this.container = document.createElement('section');
            this.container.id = 'comments-section';
            this.container.className = 'comments-section';
            this.container.setAttribute('aria-label', 'Sección de comentarios');

            // Insertar antes del footer
            const footer = document.querySelector('footer');
            if (footer && footer.parentNode) {
                footer.parentNode.insertBefore(this.container, footer);
            } else {
                document.body.appendChild(this.container);
            }
        }
    }

    /**
     * Renderiza la sección de comentarios
     */
    render() {
        const comments = this.chapter !== null
            ? CommentsStorage.getByChapter(this.mangaId, this.chapter)
            : CommentsStorage.getByManga(this.mangaId);

        const isLoggedIn = UserProfileStorage.isLoggedIn();
        const profile = UserProfileStorage.get();

        this.container.innerHTML = `
            <div class="comments-wrapper">
                <h2 class="comments-title">
                    <i class="fas fa-comments" aria-hidden="true"></i>
                    Comentarios (${comments.length})
                </h2>

                ${isLoggedIn ? this.renderCommentForm(profile) : this.renderLoginPrompt()}

                <div class="comments-list" id="comments-list">
                    ${comments.length > 0
                        ? comments.map(c => this.renderComment(c, profile)).join('')
                        : this.renderEmptyState()
                    }
                </div>
            </div>
        `;
    }

    /**
     * Renderiza el formulario de comentarios
     */
    renderCommentForm(profile) {
        return `
            <form class="comment-form" id="comment-form">
                <div class="comment-form-header">
                    <img src="${profile.avatar}" alt="${profile.username}" class="comment-avatar">
                    <span class="comment-username">${profile.username}</span>
                </div>
                <div class="comment-form-body">
                    <textarea
                        id="comment-text"
                        class="comment-textarea"
                        placeholder="Escribe tu comentario..."
                        maxlength="1000"
                        required
                        aria-label="Escribe tu comentario"
                    ></textarea>
                    <div class="comment-form-footer">
                        <span class="comment-char-count"><span id="char-count">0</span>/1000</span>
                        <button type="submit" class="comment-submit-btn">
                            <i class="fas fa-paper-plane" aria-hidden="true"></i>
                            Comentar
                        </button>
                    </div>
                </div>
            </form>
        `;
    }

    /**
     * Renderiza el prompt de login
     */
    renderLoginPrompt() {
        return `
            <div class="comment-login-prompt">
                <i class="fas fa-user-circle" aria-hidden="true"></i>
                <p>Inicia sesión para dejar un comentario</p>
                <button type="button" class="btn-primary" id="login-to-comment">
                    Crear cuenta
                </button>
            </div>
        `;
    }

    /**
     * Renderiza un comentario individual
     */
    renderComment(comment, currentProfile) {
        const isOwner = currentProfile && comment.userId === currentProfile.id;
        const timeAgo = this.formatTimeAgo(comment.createdAt);
        const wasEdited = comment.updatedAt ? ' (editado)' : '';

        return `
            <article class="comment" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <img src="${comment.avatar}" alt="${comment.username}" class="comment-avatar">
                    <div class="comment-meta">
                        <span class="comment-author">${comment.username}</span>
                        <span class="comment-time">${timeAgo}${wasEdited}</span>
                    </div>
                    ${isOwner ? `
                        <div class="comment-actions">
                            <button type="button" class="comment-action-btn edit-comment" data-id="${comment.id}" title="Editar">
                                <i class="fas fa-edit" aria-hidden="true"></i>
                            </button>
                            <button type="button" class="comment-action-btn delete-comment" data-id="${comment.id}" title="Eliminar">
                                <i class="fas fa-trash" aria-hidden="true"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div class="comment-body">
                    <p class="comment-text">${this.escapeHtml(comment.text)}</p>
                </div>
            </article>
        `;
    }

    /**
     * Renderiza estado vacío
     */
    renderEmptyState() {
        return `
            <div class="comments-empty">
                <i class="fas fa-comment-slash" aria-hidden="true"></i>
                <p>No hay comentarios todavía</p>
                <p class="comments-empty-hint">Sé el primero en comentar</p>
            </div>
        `;
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Formulario de comentario
        const form = document.getElementById('comment-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));

            // Contador de caracteres
            const textarea = document.getElementById('comment-text');
            const charCount = document.getElementById('char-count');
            if (textarea && charCount) {
                textarea.addEventListener('input', () => {
                    charCount.textContent = textarea.value.length;
                });
            }
        }

        // Botón de login
        const loginBtn = document.getElementById('login-to-comment');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                // Abrir modal de usuario
                if (window.GrandielApp && window.GrandielApp.UserProfile) {
                    // Usar el sistema de usuario existente
                }
                // O disparar evento
                window.dispatchEvent(new CustomEvent('grandiel:open-user-menu'));
            });
        }

        // Delegación para botones de editar/eliminar
        this.container.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-comment');
            const deleteBtn = e.target.closest('.delete-comment');

            if (editBtn) {
                this.handleEdit(editBtn.dataset.id);
            }

            if (deleteBtn) {
                this.handleDelete(deleteBtn.dataset.id);
            }
        });

        // Escuchar cambios en comentarios
        window.addEventListener(EVENTS.COMMENT_ADDED, () => this.render());
        window.addEventListener(EVENTS.COMMENT_DELETED, () => this.render());

        // Escuchar cambios de perfil
        window.addEventListener(EVENTS.USER_PROFILE_CHANGE, () => this.render());
    }

    /**
     * Maneja el envío del formulario
     */
    handleSubmit(e) {
        e.preventDefault();

        const textarea = document.getElementById('comment-text');
        const text = textarea.value.trim();

        if (!text) return;

        const comment = CommentsStorage.add({
            mangaId: this.mangaId,
            chapter: this.chapter,
            text: text
        });

        if (comment) {
            textarea.value = '';
            document.getElementById('char-count').textContent = '0';
            this.showToast('Comentario publicado');
        }
    }

    /**
     * Maneja la edición de un comentario
     */
    handleEdit(commentId) {
        const commentEl = this.container.querySelector(`[data-comment-id="${commentId}"]`);
        if (!commentEl) return;

        const textEl = commentEl.querySelector('.comment-text');
        const currentText = textEl.textContent;

        // Reemplazar texto con textarea de edición
        const editForm = document.createElement('div');
        editForm.className = 'comment-edit-form';
        editForm.innerHTML = `
            <textarea class="comment-edit-textarea" maxlength="1000">${currentText}</textarea>
            <div class="comment-edit-actions">
                <button type="button" class="btn-secondary cancel-edit">Cancelar</button>
                <button type="button" class="btn-primary save-edit">Guardar</button>
            </div>
        `;

        textEl.replaceWith(editForm);

        // Event listeners para edición
        const cancelBtn = editForm.querySelector('.cancel-edit');
        const saveBtn = editForm.querySelector('.save-edit');
        const editTextarea = editForm.querySelector('.comment-edit-textarea');

        cancelBtn.addEventListener('click', () => {
            this.render();
        });

        saveBtn.addEventListener('click', () => {
            const newText = editTextarea.value.trim();
            if (newText && newText !== currentText) {
                CommentsStorage.edit(commentId, newText);
                this.showToast('Comentario actualizado');
            }
            this.render();
        });

        editTextarea.focus();
    }

    /**
     * Maneja la eliminación de un comentario
     */
    handleDelete(commentId) {
        if (confirm('¿Estás seguro de que quieres eliminar este comentario?')) {
            if (CommentsStorage.delete(commentId)) {
                this.showToast('Comentario eliminado');
            }
        }
    }

    /**
     * Formatea el tiempo transcurrido
     */
    formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        const intervals = {
            año: 31536000,
            mes: 2592000,
            semana: 604800,
            día: 86400,
            hora: 3600,
            minuto: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `hace ${interval} ${unit}${interval > 1 ? (unit === 'mes' ? 'es' : 's') : ''}`;
            }
        }

        return 'hace un momento';
    }

    /**
     * Escapa HTML para prevenir XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Muestra un toast de notificación
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'comment-toast';
        toast.innerHTML = `
            <i class="fas fa-check-circle" aria-hidden="true"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Instancia singleton
const commentsInstance = new Comments();

/**
 * Inicializa el sistema de comentarios
 */
export const initComments = (mangaId, chapter = null) => {
    commentsInstance.init(mangaId, chapter);
};

export default commentsInstance;
