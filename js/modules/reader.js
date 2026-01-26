/**
 * reader.js - Modo de Lectura Mejorado
 * Grandiel Scan - Fase 6.2 Características Avanzadas
 *
 * Proporciona controles avanzados de lectura: zoom, brillo, contraste,
 * modos de ajuste, pantalla completa y atajos de teclado.
 */

import { ReaderSettingsStorage } from './storage.js';

/**
 * Clase EnhancedReader - Gestiona el lector mejorado
 */
class EnhancedReader {
    constructor() {
        this.container = null;
        this.controlsPanel = null;
        this.helpPanel = null;
        this.settings = ReaderSettingsStorage.get();
        this.isFullscreen = false;
        this.isInitialized = false;
    }

    /**
     * Inicializa el lector mejorado
     */
    init() {
        if (this.isInitialized) return;

        this.container = document.getElementById('chapter-images');
        if (!this.container) return;

        this.createControlsPanel();
        this.createHelpPanel();
        this.applySettings();
        this.setupEventListeners();

        this.isInitialized = true;
    }

    /**
     * Crea el panel de controles
     */
    createControlsPanel() {
        // Verificar si ya existe
        if (document.getElementById('reader-controls')) return;

        this.controlsPanel = document.createElement('div');
        this.controlsPanel.id = 'reader-controls';
        this.controlsPanel.className = 'reader-controls';
        this.controlsPanel.innerHTML = `
            <div class="reader-controls-toggle" id="toggle-reader-controls" title="Configuración del lector">
                <i class="fas fa-sliders-h" aria-hidden="true"></i>
            </div>
            <div class="reader-controls-panel" id="reader-controls-panel">
                <h4 class="reader-controls-title">Configuración del Lector</h4>

                <!-- Zoom -->
                <div class="reader-control-group">
                    <label class="reader-control-label">
                        <i class="fas fa-search-plus" aria-hidden="true"></i>
                        Zoom: <span id="zoom-value">${this.settings.zoom}%</span>
                    </label>
                    <div class="reader-control-row">
                        <button type="button" class="reader-btn" id="zoom-out" title="Reducir zoom">
                            <i class="fas fa-minus" aria-hidden="true"></i>
                        </button>
                        <input type="range" id="zoom-slider" min="50" max="200" value="${this.settings.zoom}" class="reader-slider">
                        <button type="button" class="reader-btn" id="zoom-in" title="Aumentar zoom">
                            <i class="fas fa-plus" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>

                <!-- Brillo -->
                <div class="reader-control-group">
                    <label class="reader-control-label">
                        <i class="fas fa-sun" aria-hidden="true"></i>
                        Brillo: <span id="brightness-value">${this.settings.brightness}%</span>
                    </label>
                    <input type="range" id="brightness-slider" min="50" max="150" value="${this.settings.brightness}" class="reader-slider">
                </div>

                <!-- Contraste -->
                <div class="reader-control-group">
                    <label class="reader-control-label">
                        <i class="fas fa-adjust" aria-hidden="true"></i>
                        Contraste: <span id="contrast-value">${this.settings.contrast}%</span>
                    </label>
                    <input type="range" id="contrast-slider" min="50" max="150" value="${this.settings.contrast}" class="reader-slider">
                </div>

                <!-- Modo de ajuste -->
                <div class="reader-control-group">
                    <label class="reader-control-label">
                        <i class="fas fa-expand-alt" aria-hidden="true"></i>
                        Ajuste de imagen
                    </label>
                    <div class="reader-fit-buttons">
                        <button type="button" class="reader-fit-btn ${this.settings.fitMode === 'width' ? 'active' : ''}" data-fit="width" title="Ajustar al ancho">
                            <i class="fas fa-arrows-alt-h" aria-hidden="true"></i>
                            Ancho
                        </button>
                        <button type="button" class="reader-fit-btn ${this.settings.fitMode === 'height' ? 'active' : ''}" data-fit="height" title="Ajustar al alto">
                            <i class="fas fa-arrows-alt-v" aria-hidden="true"></i>
                            Alto
                        </button>
                        <button type="button" class="reader-fit-btn ${this.settings.fitMode === 'original' ? 'active' : ''}" data-fit="original" title="Tamaño original">
                            <i class="fas fa-compress" aria-hidden="true"></i>
                            Original
                        </button>
                    </div>
                </div>

                <!-- Color de fondo -->
                <div class="reader-control-group">
                    <label class="reader-control-label">
                        <i class="fas fa-fill-drip" aria-hidden="true"></i>
                        Fondo
                    </label>
                    <div class="reader-bg-buttons">
                        <button type="button" class="reader-bg-btn ${this.settings.backgroundColor === '#000000' ? 'active' : ''}" data-bg="#000000" style="background: #000000;" title="Negro"></button>
                        <button type="button" class="reader-bg-btn ${this.settings.backgroundColor === '#1B2631' ? 'active' : ''}" data-bg="#1B2631" style="background: #1B2631;" title="Gris oscuro"></button>
                        <button type="button" class="reader-bg-btn ${this.settings.backgroundColor === '#2C3E50' ? 'active' : ''}" data-bg="#2C3E50" style="background: #2C3E50;" title="Azul oscuro"></button>
                        <button type="button" class="reader-bg-btn ${this.settings.backgroundColor === '#FFFFFF' ? 'active' : ''}" data-bg="#FFFFFF" style="background: #FFFFFF;" title="Blanco"></button>
                    </div>
                </div>

                <!-- Acciones -->
                <div class="reader-control-group reader-actions">
                    <button type="button" class="reader-action-btn" id="fullscreen-btn" title="Pantalla completa">
                        <i class="fas fa-expand" aria-hidden="true"></i>
                        Pantalla completa
                    </button>
                    <button type="button" class="reader-action-btn" id="help-btn" title="Atajos de teclado">
                        <i class="fas fa-keyboard" aria-hidden="true"></i>
                        Atajos
                    </button>
                    <button type="button" class="reader-action-btn secondary" id="reset-btn" title="Restablecer configuración">
                        <i class="fas fa-undo" aria-hidden="true"></i>
                        Restablecer
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(this.controlsPanel);
    }

    /**
     * Crea el panel de ayuda con atajos de teclado
     */
    createHelpPanel() {
        if (document.getElementById('reader-help')) return;

        this.helpPanel = document.createElement('div');
        this.helpPanel.id = 'reader-help';
        this.helpPanel.className = 'reader-help-overlay';
        this.helpPanel.innerHTML = `
            <div class="reader-help-panel">
                <button type="button" class="reader-help-close" id="close-help">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
                <h3>Atajos de Teclado</h3>
                <div class="reader-shortcuts">
                    <div class="reader-shortcut">
                        <kbd>←</kbd> / <kbd>A</kbd>
                        <span>Página anterior</span>
                    </div>
                    <div class="reader-shortcut">
                        <kbd>→</kbd> / <kbd>D</kbd>
                        <span>Página siguiente</span>
                    </div>
                    <div class="reader-shortcut">
                        <kbd>+</kbd> / <kbd>=</kbd>
                        <span>Aumentar zoom</span>
                    </div>
                    <div class="reader-shortcut">
                        <kbd>-</kbd>
                        <span>Reducir zoom</span>
                    </div>
                    <div class="reader-shortcut">
                        <kbd>0</kbd>
                        <span>Zoom 100%</span>
                    </div>
                    <div class="reader-shortcut">
                        <kbd>F</kbd>
                        <span>Pantalla completa</span>
                    </div>
                    <div class="reader-shortcut">
                        <kbd>W</kbd>
                        <span>Ajustar al ancho</span>
                    </div>
                    <div class="reader-shortcut">
                        <kbd>H</kbd>
                        <span>Ajustar al alto</span>
                    </div>
                    <div class="reader-shortcut">
                        <kbd>Esc</kbd>
                        <span>Salir pantalla completa</span>
                    </div>
                    <div class="reader-shortcut">
                        <kbd>?</kbd>
                        <span>Mostrar/ocultar ayuda</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.helpPanel);
    }

    /**
     * Aplica la configuración actual a las imágenes
     */
    applySettings() {
        if (!this.container) return;

        // Aplicar zoom
        const images = this.container.querySelectorAll('img');
        images.forEach(img => {
            img.style.transform = `scale(${this.settings.zoom / 100})`;
            img.style.transformOrigin = 'top center';
            img.style.filter = `brightness(${this.settings.brightness}%) contrast(${this.settings.contrast}%)`;

            // Aplicar modo de ajuste
            switch (this.settings.fitMode) {
                case 'width':
                    img.style.width = '100%';
                    img.style.height = 'auto';
                    img.style.maxWidth = 'none';
                    break;
                case 'height':
                    img.style.width = 'auto';
                    img.style.height = '100vh';
                    img.style.maxWidth = '100%';
                    break;
                case 'original':
                    img.style.width = 'auto';
                    img.style.height = 'auto';
                    img.style.maxWidth = '100%';
                    break;
            }
        });

        // Aplicar color de fondo
        this.container.style.backgroundColor = this.settings.backgroundColor;
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Toggle del panel
        const toggleBtn = document.getElementById('toggle-reader-controls');
        const panel = document.getElementById('reader-controls-panel');

        if (toggleBtn && panel) {
            toggleBtn.addEventListener('click', () => {
                panel.classList.toggle('active');
            });
        }

        // Zoom
        const zoomSlider = document.getElementById('zoom-slider');
        const zoomIn = document.getElementById('zoom-in');
        const zoomOut = document.getElementById('zoom-out');
        const zoomValue = document.getElementById('zoom-value');

        if (zoomSlider) {
            zoomSlider.addEventListener('input', (e) => {
                this.setZoom(parseInt(e.target.value));
                zoomValue.textContent = `${e.target.value}%`;
            });
        }

        if (zoomIn) {
            zoomIn.addEventListener('click', () => this.adjustZoom(10));
        }

        if (zoomOut) {
            zoomOut.addEventListener('click', () => this.adjustZoom(-10));
        }

        // Brillo
        const brightnessSlider = document.getElementById('brightness-slider');
        const brightnessValue = document.getElementById('brightness-value');

        if (brightnessSlider) {
            brightnessSlider.addEventListener('input', (e) => {
                this.setBrightness(parseInt(e.target.value));
                brightnessValue.textContent = `${e.target.value}%`;
            });
        }

        // Contraste
        const contrastSlider = document.getElementById('contrast-slider');
        const contrastValue = document.getElementById('contrast-value');

        if (contrastSlider) {
            contrastSlider.addEventListener('input', (e) => {
                this.setContrast(parseInt(e.target.value));
                contrastValue.textContent = `${e.target.value}%`;
            });
        }

        // Modo de ajuste
        document.querySelectorAll('.reader-fit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.reader-fit-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.setFitMode(btn.dataset.fit);
            });
        });

        // Color de fondo
        document.querySelectorAll('.reader-bg-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.reader-bg-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.setBackgroundColor(btn.dataset.bg);
            });
        });

        // Pantalla completa
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }

        // Ayuda
        const helpBtn = document.getElementById('help-btn');
        const closeHelp = document.getElementById('close-help');

        if (helpBtn) {
            helpBtn.addEventListener('click', () => this.showHelp());
        }

        if (closeHelp) {
            closeHelp.addEventListener('click', () => this.hideHelp());
        }

        if (this.helpPanel) {
            this.helpPanel.addEventListener('click', (e) => {
                if (e.target === this.helpPanel) {
                    this.hideHelp();
                }
            });
        }

        // Restablecer
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSettings());
        }

        // Atajos de teclado
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Cambios de fullscreen
        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !!document.fullscreenElement;
            this.updateFullscreenButton();
        });
    }

    /**
     * Maneja los atajos de teclado
     */
    handleKeyboard(e) {
        // Ignorar si se está escribiendo en un input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case '+':
            case '=':
                e.preventDefault();
                this.adjustZoom(10);
                break;
            case '-':
                e.preventDefault();
                this.adjustZoom(-10);
                break;
            case '0':
                e.preventDefault();
                this.setZoom(100);
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                this.toggleFullscreen();
                break;
            case 'w':
            case 'W':
                e.preventDefault();
                this.setFitMode('width');
                break;
            case 'h':
            case 'H':
                e.preventDefault();
                this.setFitMode('height');
                break;
            case '?':
                e.preventDefault();
                this.toggleHelp();
                break;
            case 'Escape':
                if (this.helpPanel?.classList.contains('active')) {
                    this.hideHelp();
                }
                break;
        }
    }

    /**
     * Establece el zoom
     */
    setZoom(value) {
        this.settings.zoom = Math.max(50, Math.min(200, value));
        this.saveSettings();
        this.applySettings();
        this.updateZoomUI();
    }

    /**
     * Ajusta el zoom relativamente
     */
    adjustZoom(delta) {
        this.setZoom(this.settings.zoom + delta);
    }

    /**
     * Actualiza la UI del zoom
     */
    updateZoomUI() {
        const slider = document.getElementById('zoom-slider');
        const value = document.getElementById('zoom-value');

        if (slider) slider.value = this.settings.zoom;
        if (value) value.textContent = `${this.settings.zoom}%`;
    }

    /**
     * Establece el brillo
     */
    setBrightness(value) {
        this.settings.brightness = Math.max(50, Math.min(150, value));
        this.saveSettings();
        this.applySettings();
    }

    /**
     * Establece el contraste
     */
    setContrast(value) {
        this.settings.contrast = Math.max(50, Math.min(150, value));
        this.saveSettings();
        this.applySettings();
    }

    /**
     * Establece el modo de ajuste
     */
    setFitMode(mode) {
        this.settings.fitMode = mode;
        this.saveSettings();
        this.applySettings();

        // Actualizar botones
        document.querySelectorAll('.reader-fit-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.fit === mode);
        });
    }

    /**
     * Establece el color de fondo
     */
    setBackgroundColor(color) {
        this.settings.backgroundColor = color;
        this.saveSettings();
        this.applySettings();

        // Actualizar botones
        document.querySelectorAll('.reader-bg-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.bg === color);
        });
    }

    /**
     * Alterna pantalla completa
     */
    toggleFullscreen() {
        if (this.isFullscreen) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }

    /**
     * Actualiza el botón de pantalla completa
     */
    updateFullscreenButton() {
        const btn = document.getElementById('fullscreen-btn');
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = this.isFullscreen ? 'fas fa-compress' : 'fas fa-expand';
            }
            btn.innerHTML = `
                <i class="${this.isFullscreen ? 'fas fa-compress' : 'fas fa-expand'}" aria-hidden="true"></i>
                ${this.isFullscreen ? 'Salir' : 'Pantalla completa'}
            `;
        }
    }

    /**
     * Muestra el panel de ayuda
     */
    showHelp() {
        this.helpPanel?.classList.add('active');
    }

    /**
     * Oculta el panel de ayuda
     */
    hideHelp() {
        this.helpPanel?.classList.remove('active');
    }

    /**
     * Alterna el panel de ayuda
     */
    toggleHelp() {
        this.helpPanel?.classList.toggle('active');
    }

    /**
     * Restablece la configuración
     */
    resetSettings() {
        this.settings = ReaderSettingsStorage.reset();
        this.applySettings();
        this.updateAllUI();
    }

    /**
     * Actualiza toda la UI
     */
    updateAllUI() {
        // Zoom
        const zoomSlider = document.getElementById('zoom-slider');
        const zoomValue = document.getElementById('zoom-value');
        if (zoomSlider) zoomSlider.value = this.settings.zoom;
        if (zoomValue) zoomValue.textContent = `${this.settings.zoom}%`;

        // Brillo
        const brightnessSlider = document.getElementById('brightness-slider');
        const brightnessValue = document.getElementById('brightness-value');
        if (brightnessSlider) brightnessSlider.value = this.settings.brightness;
        if (brightnessValue) brightnessValue.textContent = `${this.settings.brightness}%`;

        // Contraste
        const contrastSlider = document.getElementById('contrast-slider');
        const contrastValue = document.getElementById('contrast-value');
        if (contrastSlider) contrastSlider.value = this.settings.contrast;
        if (contrastValue) contrastValue.textContent = `${this.settings.contrast}%`;

        // Modo de ajuste
        document.querySelectorAll('.reader-fit-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.fit === this.settings.fitMode);
        });

        // Color de fondo
        document.querySelectorAll('.reader-bg-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.bg === this.settings.backgroundColor);
        });
    }

    /**
     * Guarda la configuración
     */
    saveSettings() {
        ReaderSettingsStorage.set(this.settings);
    }
}

// Instancia singleton
const readerInstance = new EnhancedReader();

/**
 * Inicializa el lector mejorado
 */
export const initEnhancedReader = () => {
    readerInstance.init();
};

export default readerInstance;
