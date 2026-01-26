/**
 * theme-toggle.js - Sistema de Tema Oscuro/Claro
 * Grandiel Scan - Fase 2 Refactorización CSS
 */

(function() {
    'use strict';

    // Constantes
    const STORAGE_KEY = 'grandiel-theme';
    const THEMES = {
        DARK: 'dark',
        LIGHT: 'light'
    };

    // Estado
    let currentTheme = THEMES.DARK;

    /**
     * Obtiene el tema preferido del sistema
     * @returns {string} 'dark' o 'light'
     */
    function getSystemPreference() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return THEMES.LIGHT;
        }
        return THEMES.DARK;
    }

    /**
     * Obtiene el tema guardado en localStorage
     * @returns {string|null}
     */
    function getSavedTheme() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            console.warn('No se pudo acceder a localStorage:', e);
            return null;
        }
    }

    /**
     * Guarda el tema en localStorage
     * @param {string} theme
     */
    function saveTheme(theme) {
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (e) {
            console.warn('No se pudo guardar en localStorage:', e);
        }
    }

    /**
     * Aplica el tema al documento
     * @param {string} theme
     * @param {boolean} animate - Si debe animar la transición
     */
    function applyTheme(theme, animate = true) {
        const html = document.documentElement;

        if (animate) {
            html.classList.add('theme-transition');
            html.setAttribute('data-theme-changing', '');
        }

        html.setAttribute('data-theme', theme);
        currentTheme = theme;

        // Actualizar meta theme-color para navegadores móviles
        updateMetaThemeColor(theme);

        // Actualizar iconos del toggle
        updateToggleIcons(theme);

        if (animate) {
            setTimeout(() => {
                html.classList.remove('theme-transition');
                html.removeAttribute('data-theme-changing');
            }, 500);
        }
    }

    /**
     * Actualiza el meta tag theme-color
     * @param {string} theme
     */
    function updateMetaThemeColor(theme) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');

        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }

        metaThemeColor.content = theme === THEMES.LIGHT ? '#ffffff' : '#1B2631';
    }

    /**
     * Actualiza los iconos del toggle de tema
     * @param {string} theme
     */
    function updateToggleIcons(theme) {
        const toggleBtns = document.querySelectorAll('.theme-toggle-btn, .nav-theme-toggle');

        toggleBtns.forEach(btn => {
            const sunIcon = btn.querySelector('.fa-sun');
            const moonIcon = btn.querySelector('.fa-moon');

            if (sunIcon && moonIcon) {
                if (theme === THEMES.DARK) {
                    sunIcon.style.display = 'block';
                    moonIcon.style.display = 'none';
                } else {
                    sunIcon.style.display = 'none';
                    moonIcon.style.display = 'block';
                }
            }
        });
    }

    /**
     * Alterna entre temas
     */
    function toggleTheme() {
        const newTheme = currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
        applyTheme(newTheme, true);
        saveTheme(newTheme);

        // Disparar evento personalizado
        window.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme: newTheme }
        }));
    }

    /**
     * Crea el botón de toggle flotante
     */
    function createFloatingToggle() {
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

        // Agregar evento
        wrapper.querySelector('.theme-toggle-btn').addEventListener('click', toggleTheme);
    }

    /**
     * Inicializa los toggles existentes en el DOM
     */
    function initExistingToggles() {
        const toggles = document.querySelectorAll('[data-theme-toggle]');

        toggles.forEach(toggle => {
            toggle.addEventListener('click', toggleTheme);
        });
    }

    /**
     * Escucha cambios en la preferencia del sistema
     */
    function watchSystemPreference() {
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                // Solo cambiar si no hay preferencia guardada
                if (!getSavedTheme()) {
                    applyTheme(e.matches ? THEMES.DARK : THEMES.LIGHT, true);
                }
            });
        }
    }

    /**
     * Inicializa el sistema de temas
     */
    function init() {
        // Determinar tema inicial
        const savedTheme = getSavedTheme();
        const initialTheme = savedTheme || getSystemPreference();

        // Aplicar tema sin animación inicial
        applyTheme(initialTheme, false);

        // Crear toggle flotante
        createFloatingToggle();

        // Inicializar toggles existentes
        initExistingToggles();

        // Escuchar cambios del sistema
        watchSystemPreference();
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // API pública
    window.GrandielTheme = {
        toggle: toggleTheme,
        setTheme: function(theme) {
            if (theme === THEMES.DARK || theme === THEMES.LIGHT) {
                applyTheme(theme, true);
                saveTheme(theme);
            }
        },
        getTheme: function() {
            return currentTheme;
        },
        THEMES: THEMES
    };

})();
