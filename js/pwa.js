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
            console.log('[PWA] Conexión restaurada');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showConnectivityStatus('offline');
            console.log('[PWA] Sin conexión');
        });
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
            banner.textContent = 'Sin conexión - Algunas funciones no están disponibles';
            banner.classList.add('offline');
            banner.classList.remove('online');
            banner.style.display = 'block';
        } else {
            banner.textContent = 'Conexión restaurada';
            banner.classList.add('online');
            banner.classList.remove('offline');

            // Ocultar después de 3 segundos
            setTimeout(() => {
                banner.style.display = 'none';
            }, 3000);
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
     * Oculta el botón de instalación
     */
    hideInstallButton() {
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
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
    isOnline: () => pwaManager.isOnline
};
