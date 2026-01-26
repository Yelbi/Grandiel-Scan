/**
 * pwa.js - Registro y gestión del Service Worker
 * Grandiel Scan - Fase 4 Optimización de Performance
 *
 * Registra el Service Worker y proporciona funcionalidades PWA.
 */

/**
 * Clase PWAManager - Gestiona funcionalidades PWA
 */
class PWAManager {
    constructor() {
        this.swRegistration = null;
        this.isOnline = navigator.onLine;
        this.deferredPrompt = null;
    }

    /**
     * Inicializa el PWA Manager
     */
    async init() {
        // Verificar soporte de Service Worker
        if (!('serviceWorker' in navigator)) {
            console.warn('[PWA] Service Worker no soportado');
            return;
        }

        // Registrar Service Worker
        await this.registerServiceWorker();

        // Configurar listeners de conectividad
        this.setupConnectivityListeners();

        // Configurar prompt de instalación
        this.setupInstallPrompt();

        // Verificar actualizaciones periódicamente
        this.checkForUpdates();

        console.log('[PWA] PWA Manager inicializado');
    }

    /**
     * Registra el Service Worker
     */
    async registerServiceWorker() {
        try {
            this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });

            console.log('[PWA] Service Worker registrado:', this.swRegistration.scope);

            // Escuchar actualizaciones
            this.swRegistration.addEventListener('updatefound', () => {
                const newWorker = this.swRegistration.installing;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Hay una nueva versión disponible
                        this.showUpdateNotification();
                    }
                });
            });

            return this.swRegistration;
        } catch (error) {
            console.error('[PWA] Error al registrar Service Worker:', error);
            return null;
        }
    }

    /**
     * Configura listeners de conectividad
     */
    setupConnectivityListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showConnectivityStatus('online');
            this.updateOfflineIndicator(false);
            console.log('[PWA] Conexión restaurada');

            // Disparar evento para otros módulos
            window.dispatchEvent(new CustomEvent('grandiel:online'));
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showConnectivityStatus('offline');
            this.updateOfflineIndicator(true);
            console.log('[PWA] Sin conexión');

            // Disparar evento para otros módulos
            window.dispatchEvent(new CustomEvent('grandiel:offline'));
        });

        // Crear indicador offline en la navegación
        this.createOfflineIndicator();

        // Verificar estado inicial
        if (!navigator.onLine) {
            this.updateOfflineIndicator(true);
        }
    }

    /**
     * Crea el indicador offline en la navegación
     */
    createOfflineIndicator() {
        const nav = document.querySelector('.ctn-icon, .nav-icons, header nav');
        if (!nav) return;

        let indicator = document.getElementById('offline-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'offline-indicator';
            indicator.className = 'offline-indicator';
            indicator.innerHTML = `
                <i class="fas fa-wifi-slash" aria-hidden="true"></i>
                <span>Offline</span>
            `;
            nav.insertBefore(indicator, nav.firstChild);
        }
    }

    /**
     * Actualiza el indicador offline
     * @param {boolean} isOffline
     */
    updateOfflineIndicator(isOffline) {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            if (isOffline) {
                indicator.classList.add('show');
            } else {
                indicator.classList.remove('show');
            }
        }

        // Añadir clase al body para estilos condicionales
        document.body.classList.toggle('is-offline', isOffline);
    }

    /**
     * Muestra el estado de conectividad
     * @param {string} status - 'online' o 'offline'
     */
    showConnectivityStatus(status) {
        // Crear o actualizar banner de estado
        let banner = document.getElementById('connectivity-banner');

        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'connectivity-banner';
            banner.className = 'connectivity-banner';
            document.body.appendChild(banner);
        }

        if (status === 'offline') {
            banner.innerHTML = `
                <i class="fas fa-wifi-slash" aria-hidden="true"></i>
                Sin conexion - Algunas funciones no estan disponibles
            `;
            banner.classList.add('offline');
            banner.classList.remove('online');
            banner.style.display = 'block';
        } else {
            banner.innerHTML = `
                <i class="fas fa-wifi" aria-hidden="true"></i>
                Conexion restaurada
            `;
            banner.classList.add('online');
            banner.classList.remove('offline');

            // Ocultar después de 3 segundos
            setTimeout(() => {
                banner.style.display = 'none';
            }, 3000);
        }
    }

    /**
     * Muestra estado de caché
     * @param {string} message
     * @param {string} type - 'loading', 'success', 'error'
     */
    showCacheStatus(message, type = 'loading') {
        let status = document.getElementById('cache-status');

        if (!status) {
            status = document.createElement('div');
            status.id = 'cache-status';
            status.className = 'cache-status';
            document.body.appendChild(status);
        }

        const icons = {
            loading: '<i class="fas fa-sync-alt"></i>',
            success: '<i class="fas fa-check"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>'
        };

        status.innerHTML = `
            <span class="cache-status-icon ${type}">${icons[type]}</span>
            <span>${message}</span>
        `;
        status.classList.add('show');

        if (type !== 'loading') {
            setTimeout(() => {
                status.classList.remove('show');
            }, 3000);
        }
    }

    /**
     * Oculta estado de caché
     */
    hideCacheStatus() {
        const status = document.getElementById('cache-status');
        if (status) {
            status.classList.remove('show');
        }
    }

    /**
     * Configura el prompt de instalación
     */
    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevenir el prompt automático
            e.preventDefault();
            this.deferredPrompt = e;

            // Mostrar botón de instalación personalizado
            this.showInstallButton();

            console.log('[PWA] Prompt de instalación disponible');
        });

        window.addEventListener('appinstalled', () => {
            console.log('[PWA] Aplicación instalada');
            this.hideInstallButton();
            this.deferredPrompt = null;
        });
    }

    /**
     * Muestra el botón de instalación
     */
    showInstallButton() {
        // Mostrar prompt mejorado después de un delay
        setTimeout(() => {
            this.showEnhancedInstallPrompt();
        }, 3000);

        // También mostrar botón simple
        let installBtn = document.getElementById('pwa-install-btn');

        if (!installBtn) {
            installBtn = document.createElement('button');
            installBtn.id = 'pwa-install-btn';
            installBtn.className = 'pwa-install-btn';
            installBtn.innerHTML = `
                <i class="fas fa-download" aria-hidden="true"></i>
                <span>Instalar App</span>
            `;
            installBtn.addEventListener('click', () => this.promptInstall());
            document.body.appendChild(installBtn);
        }

        installBtn.style.display = 'flex';
    }

    /**
     * Muestra el prompt de instalación mejorado
     */
    showEnhancedInstallPrompt() {
        // No mostrar si ya está instalado o si ya se mostró
        if (this.isInstalled() || sessionStorage.getItem('install-prompt-dismissed')) {
            return;
        }

        let prompt = document.getElementById('install-prompt');

        if (!prompt) {
            prompt = document.createElement('div');
            prompt.id = 'install-prompt';
            prompt.className = 'install-prompt';
            prompt.innerHTML = `
                <div class="install-prompt-header">
                    <div class="install-prompt-icon">
                        <img src="/img/logo.gif" alt="Grandiel Scan">
                    </div>
                    <div>
                        <h3 class="install-prompt-title">Instalar Grandiel Scan</h3>
                        <p class="install-prompt-subtitle">Acceso rapido desde tu pantalla</p>
                    </div>
                </div>
                <p class="install-prompt-body">
                    Instala la app para acceder mas rapido, recibir notificaciones de nuevos capitulos y leer offline.
                </p>
                <div class="install-prompt-actions">
                    <button class="install-prompt-btn secondary" id="install-prompt-dismiss">
                        Ahora no
                    </button>
                    <button class="install-prompt-btn primary" id="install-prompt-accept">
                        <i class="fas fa-download"></i> Instalar
                    </button>
                </div>
            `;
            document.body.appendChild(prompt);

            document.getElementById('install-prompt-dismiss').addEventListener('click', () => {
                this.hideEnhancedInstallPrompt();
                sessionStorage.setItem('install-prompt-dismissed', 'true');
            });

            document.getElementById('install-prompt-accept').addEventListener('click', () => {
                this.hideEnhancedInstallPrompt();
                this.promptInstall();
            });
        }

        setTimeout(() => prompt.classList.add('show'), 100);
    }

    /**
     * Oculta el prompt de instalación mejorado
     */
    hideEnhancedInstallPrompt() {
        const prompt = document.getElementById('install-prompt');
        if (prompt) {
            prompt.classList.remove('show');
        }
    }

    /**
     * Oculta el botón de instalación
     */
    hideInstallButton() {
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
        this.hideEnhancedInstallPrompt();
    }

    /**
     * Muestra el prompt de instalación
     */
    async promptInstall() {
        if (!this.deferredPrompt) {
            console.warn('[PWA] No hay prompt de instalación disponible');
            return;
        }

        // Mostrar el prompt
        this.deferredPrompt.prompt();

        // Esperar la respuesta del usuario
        const { outcome } = await this.deferredPrompt.userChoice;

        console.log(`[PWA] Usuario ${outcome === 'accepted' ? 'aceptó' : 'rechazó'} la instalación`);

        this.deferredPrompt = null;
        this.hideInstallButton();
    }

    /**
     * Muestra notificación de actualización disponible
     */
    showUpdateNotification() {
        let updateBanner = document.getElementById('update-banner');

        if (!updateBanner) {
            updateBanner = document.createElement('div');
            updateBanner.id = 'update-banner';
            updateBanner.className = 'update-banner';
            updateBanner.innerHTML = `
                <span>Nueva versión disponible</span>
                <button id="update-btn">Actualizar</button>
                <button id="dismiss-update-btn" aria-label="Cerrar">×</button>
            `;
            document.body.appendChild(updateBanner);

            document.getElementById('update-btn').addEventListener('click', () => {
                this.updateApp();
            });

            document.getElementById('dismiss-update-btn').addEventListener('click', () => {
                updateBanner.style.display = 'none';
            });
        }

        updateBanner.style.display = 'flex';
    }

    /**
     * Actualiza la aplicación
     */
    updateApp() {
        if (this.swRegistration?.waiting) {
            // Decirle al SW que tome control
            this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Recargar la página
        window.location.reload();
    }

    /**
     * Verifica actualizaciones periódicamente
     */
    checkForUpdates() {
        // Verificar cada hora
        setInterval(() => {
            if (this.swRegistration) {
                this.swRegistration.update();
            }
        }, 60 * 60 * 1000);
    }

    /**
     * Obtiene la versión del Service Worker
     * @returns {Promise<string>}
     */
    async getVersion() {
        if (!this.swRegistration?.active) {
            return null;
        }

        return new Promise((resolve) => {
            const channel = new MessageChannel();
            channel.port1.onmessage = (event) => {
                resolve(event.data.version);
            };
            this.swRegistration.active.postMessage(
                { type: 'GET_VERSION' },
                [channel.port2]
            );
        });
    }

    /**
     * Limpia la caché
     * @returns {Promise<boolean>}
     */
    async clearCache() {
        if (!this.swRegistration?.active) {
            return false;
        }

        return new Promise((resolve) => {
            const channel = new MessageChannel();
            channel.port1.onmessage = (event) => {
                resolve(event.data.cleared);
            };
            this.swRegistration.active.postMessage(
                { type: 'CLEAR_CACHE' },
                [channel.port2]
            );
        });
    }

    /**
     * Verifica si la app está instalada
     * @returns {boolean}
     */
    isInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }
}

// Crear instancia global
const pwaManager = new PWAManager();

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => pwaManager.init());
} else {
    pwaManager.init();
}

// Exportar para uso externo
export default pwaManager;

// API global
window.PWA = {
    install: () => pwaManager.promptInstall(),
    update: () => pwaManager.updateApp(),
    clearCache: () => pwaManager.clearCache(),
    getVersion: () => pwaManager.getVersion(),
    isInstalled: () => pwaManager.isInstalled(),
    isOnline: () => pwaManager.isOnline,
    showCacheStatus: (msg, type) => pwaManager.showCacheStatus(msg, type),
    hideCacheStatus: () => pwaManager.hideCacheStatus()
};
