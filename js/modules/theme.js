/**
 * theme.js - Sistema de Tema Oscuro/Claro
 * Grandiel Scan - Fase 3 Refactorización JavaScript
 *
 * Gestiona el tema de la aplicación con soporte para
 * preferencias del sistema y persistencia en localStorage.
 */

import { CONFIG, EVENTS, updateState } from '../config.js';
import { ThemeStorage } from './storage.js';

const { THEME } = CONFIG;

/**
 * Clase ThemeManager - Gestiona el tema de la aplicación
 */
class ThemeManager {
    constructor() {
        this.currentTheme = THEME.DEFAULT;
        this.toggleElements = [];
        this.isTransitioning = false;
    }

    /**
     * Inicializa el sistema de temas
     */
    init() {
        // Obtener tema guardado o preferencia del sistema
        const savedTheme = ThemeStorage.get();
        const systemTheme = this.getSystemPreference();
        this.currentTheme = savedTheme || systemTheme;

        // Aplicar tema sin animación inicial
        this.applyTheme(this.currentTheme, false);

        // Crear botón de toggle flotante
        this.createFloatingToggle();

        // Inicializar toggles existentes en el DOM
        this.initExistingToggles();

        // Escuchar cambios en preferencia del sistema
        this.watchSystemPreference();

        // Actualizar estado global
        updateState('theme', this.currentTheme);
    }

    /**
     * Obtiene la preferencia de tema del sistema
     * @returns {string} 'dark' o 'light'
     */
    getSystemPreference() {
        if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
            return THEME.LIGHT;
        }
        return THEME.DARK;
    }

    /**
     * Aplica el tema al documento
     * @param {string} theme - Tema a aplicar
     * @param {boolean} animate - Si debe animar la transición
     */
    applyTheme(theme, animate = true) {
        const html = document.documentElement;

        if (animate && !this.isTransitioning) {
            this.isTransitioning = true;
            html.classList.add('theme-transition');
        }

        // Aplicar el tema
        html.setAttribute('data-theme', theme);
        this.currentTheme = theme;

        // Actualizar meta theme-color para móviles
        this.updateMetaThemeColor(theme);

        // Actualizar iconos del toggle
        this.updateToggleIcons(theme);

        // Actualizar estado global
        updateState('theme', theme);

        if (animate) {
            setTimeout(() => {
                html.classList.remove('theme-transition');
                this.isTransitioning = false;
            }, CONFIG.ANIMATIONS.TRANSITION_SLOW);
        }
    }

    /**
     * Actualiza el meta tag theme-color para navegadores móviles
     * @param {string} theme
     */
    updateMetaThemeColor(theme) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');

        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }

        metaThemeColor.content = theme === THEME.LIGHT ? '#ffffff' : '#1a1a1a';
    }

    /**
     * Actualiza los iconos de todos los toggles de tema
     * @param {string} theme
     */
    updateToggleIcons(theme) {
        const toggleBtns = document.querySelectorAll('.theme-toggle-btn, .nav-theme-toggle, [data-theme-toggle]');

        toggleBtns.forEach(btn => {
            const sunIcon = btn.querySelector('.fa-sun');
            const moonIcon = btn.querySelector('.fa-moon');

            if (sunIcon && moonIcon) {
                if (theme === THEME.DARK) {
                    sunIcon.style.display = 'block';
                    moonIcon.style.display = 'none';
                    btn.setAttribute('aria-label', 'Cambiar a tema claro');
                } else {
                    sunIcon.style.display = 'none';
                    moonIcon.style.display = 'block';
                    btn.setAttribute('aria-label', 'Cambiar a tema oscuro');
                }
            }
        });
    }

    /**
     * Alterna entre tema oscuro y claro
     */
    toggle() {
        const newTheme = this.currentTheme === THEME.DARK ? THEME.LIGHT : THEME.DARK;

        this.applyTheme(newTheme, true);
        ThemeStorage.set(newTheme);

        // Disparar evento personalizado
        window.dispatchEvent(new CustomEvent(EVENTS.THEME_CHANGE, {
            detail: { theme: newTheme, previousTheme: this.currentTheme }
        }));
    }

    /**
     * Establece un tema específico
     * @param {string} theme - 'dark' o 'light'
     */
    setTheme(theme) {
        if (theme === THEME.DARK || theme === THEME.LIGHT) {
            this.applyTheme(theme, true);
            ThemeStorage.set(theme);

            window.dispatchEvent(new CustomEvent(EVENTS.THEME_CHANGE, {
                detail: { theme, previousTheme: this.currentTheme }
            }));
        }
    }

    /**
     * Obtiene el tema actual
     * @returns {string}
     */
    getTheme() {
        return this.currentTheme;
    }

    /**
     * Verifica si el tema actual es oscuro
     * @returns {boolean}
     */
    isDark() {
        return this.currentTheme === THEME.DARK;
    }

    /**
     * Crea el botón de toggle flotante
     */
    createFloatingToggle() {
        // Verificar si ya existe
        if (document.querySelector('.theme-toggle-wrapper')) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'theme-toggle-wrapper';
        wrapper.innerHTML = `
            <button class="theme-toggle-btn" aria-label="Cambiar tema" title="Cambiar tema">
                <i class="fas fa-sun" aria-hidden="true"></i>
                <i class="fas fa-moon" aria-hidden="true"></i>
            </button>
        `;

        document.body.appendChild(wrapper);

        // Agregar evento con bind para mantener contexto
        const btn = wrapper.querySelector('.theme-toggle-btn');
        btn.addEventListener('click', () => this.toggle());

        // Registrar elemento para actualización de iconos
        this.toggleElements.push(btn);
    }

    /**
     * Inicializa toggles existentes en el DOM
     */
    initExistingToggles() {
        const toggles = document.querySelectorAll('[data-theme-toggle]');

        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => this.toggle());
            this.toggleElements.push(toggle);
        });
    }

    /**
     * Escucha cambios en la preferencia del sistema
     */
    watchSystemPreference() {
        const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');

        if (mediaQuery) {
            mediaQuery.addEventListener('change', (e) => {
                // Solo cambiar si no hay preferencia guardada
                if (!ThemeStorage.get()) {
                    this.applyTheme(e.matches ? THEME.DARK : THEME.LIGHT, true);
                }
            });
        }
    }

    /**
     * Destruye la instancia y limpia los listeners
     */
    destroy() {
        // Remover wrapper flotante
        const wrapper = document.querySelector('.theme-toggle-wrapper');
        if (wrapper) {
            wrapper.remove();
        }

        // Limpiar array de elementos
        this.toggleElements = [];
    }
}

// Crear instancia única (singleton)
const themeManager = new ThemeManager();

// Inicializar cuando el DOM esté listo
const initTheme = () => {
    themeManager.init();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
} else {
    initTheme();
}

// API pública
export const Theme = {
    toggle: () => themeManager.toggle(),
    set: (theme) => themeManager.setTheme(theme),
    get: () => themeManager.getTheme(),
    isDark: () => themeManager.isDark(),
    THEMES: THEME
};

export default Theme;
