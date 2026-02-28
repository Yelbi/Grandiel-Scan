/**
 * theme.js - Sistema de Tema Oscuro/Claro
 * Grandiel Scan - Fase 3 Refactorización JavaScript
 *
 * Gestiona el tema de la aplicación con soporte para
 * preferencias del sistema y persistencia en localStorage.
 */

import { CONFIG, updateState } from '../config.js';
import { ThemeStorage } from './storage.js';

const { THEME } = CONFIG;

/**
 * Clase ThemeManager - Gestiona el tema de la aplicación
 */
class ThemeManager {
    constructor() {
        this.currentTheme = THEME.DARK;
    }

    init() {
        document.documentElement.setAttribute('data-theme', THEME.DARK);
        ThemeStorage.set(THEME.DARK);
        updateState('theme', THEME.DARK);
    }

    toggle() {}
    setTheme() {}
    getTheme() { return THEME.DARK; }
    isDark() { return true; }
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
