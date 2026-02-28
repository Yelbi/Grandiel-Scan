/**
 * Service Worker - Grandiel Scan
 * Fase 4: Optimización de Performance
 *
 * Proporciona caché offline, estrategias de caching y
 * mejoras de rendimiento para la PWA.
 */

const CACHE_VERSION = 'v2.1.26';
const CACHE_NAME = `grandiel-scan-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline.html';

// Assets estáticos que siempre se cachean
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/Mangas.html',
    '/Actualizaciones.html',
    '/Nuevos.html',
    '/manga.html',
    '/chapter.html',
    '/Favoritos.html',
    '/Historial.html',
    '/offline.html',
    // CSS Principal y módulos
    '/Styles/Style.css',
    '/Styles/base.css',
    '/Styles/layout.css',
    '/Styles/components.css',
    '/Styles/utilities.css',
    '/Styles/theme.css',
    '/Styles/pwa.css',
    '/Styles/user.css',
    '/Styles/comments.css',
    '/Styles/notifications.css',
    '/Styles/reader.css',
    '/Styles/download.css',
    // JavaScript Principal y módulos
    '/js/main.js',
    '/js/config.js',
    '/js/pwa.js',
    '/js/modules/storage.js',
    '/js/modules/theme.js',
    '/js/modules/search.js',
    '/js/modules/filter.js',
    '/js/modules/navigation.js',
    '/js/modules/user.js',
    '/js/modules/comments.js',
    '/js/modules/notifications.js',
    '/js/modules/reader.js',
    '/js/modules/download.js',
    '/js/pages/favorites.js',
    '/js/pages/history.js',
    '/js/pages/actualizaciones.js',
    '/js/pages/nuevos.js',
    // Datos y recursos
    '/data/mangas.json',
    '/img/logo.gif',
    '/img/logo.jpg',
    '/img/default-avatar.svg',
    '/img/avatars/avatar1.svg',
    '/img/avatars/avatar2.svg',
    '/img/avatars/avatar3.svg',
    '/img/avatars/avatar4.svg',
    '/manifest.json'
];

// Assets de terceros que se cachean
const EXTERNAL_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Dosis:wght@400;500;600;700&display=swap',
    'https://use.fontawesome.com/releases/v5.6.3/css/all.css'
];

// Patrones de URLs para diferentes estrategias de caché
const CACHE_STRATEGIES = {
    // Cache First: Para assets estáticos (fuentes e imágenes que no cambian)
    cacheFirst: [
        /\.woff2?$/,
        /\.ttf$/,
        /\.eot$/,
        /\/img\/.*\.(png|jpg|jpeg|gif|webp|svg)$/i
    ],
    // Network First: Para datos dinámicos y páginas HTML (siempre la versión más reciente)
    networkFirst: [
        /\/data\/.*\.json$/,
        /\/api\//,
        /\.html$/,
        /\/$/
    ],
    // Stale While Revalidate: Para CSS y JS (rápido con actualización en background)
    staleWhileRevalidate: [
        /\.css$/,
        /\.js$/
    ]
};

/**
 * Evento de instalación del Service Worker
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Cacheando assets estáticos...');
                // Cachear assets estáticos (ignorar errores individuales)
                return Promise.allSettled([
                    ...STATIC_ASSETS.map(url => cache.add(url).catch(err => {
                        console.warn(`[SW] No se pudo cachear: ${url}`, err);
                    })),
                    ...EXTERNAL_ASSETS.map(url => cache.add(url).catch(err => {
                        console.warn(`[SW] No se pudo cachear externo: ${url}`, err);
                    }))
                ]);
            })
            .then(() => {
                console.log('[SW] Instalación completada');
                return self.skipWaiting();
            })
    );
});

/**
 * Evento de activación del Service Worker
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activando Service Worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                // Eliminar caches antiguas
                return Promise.all(
                    cacheNames
                        .filter((name) => name.startsWith('grandiel-scan-') && name !== CACHE_NAME)
                        .map((name) => {
                            console.log(`[SW] Eliminando cache antigua: ${name}`);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activación completada');
                return self.clients.claim();
            })
    );
});

/**
 * Determina la estrategia de caché para una URL
 * @param {string} url
 * @returns {string} Nombre de la estrategia
 */
function getCacheStrategy(url) {
    for (const pattern of CACHE_STRATEGIES.cacheFirst) {
        if (pattern.test(url)) return 'cacheFirst';
    }
    for (const pattern of CACHE_STRATEGIES.networkFirst) {
        if (pattern.test(url)) return 'networkFirst';
    }
    for (const pattern of CACHE_STRATEGIES.staleWhileRevalidate) {
        if (pattern.test(url)) return 'staleWhileRevalidate';
    }
    return 'networkFirst'; // Default
}

/**
 * Estrategia Cache First
 * Usa caché si está disponible, sino fetch de red
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('[SW] Error en cacheFirst:', error);
        return getOfflineFallback(request);
    }
}

/**
 * Estrategia Network First
 * Intenta red primero, luego caché como fallback
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('[SW] Red no disponible, usando caché');
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return getOfflineFallback(request);
    }
}

/**
 * Obtiene la respuesta de fallback offline
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function getOfflineFallback(request) {
    const url = new URL(request.url);

    // Para navegación (HTML), mostrar página offline
    if (request.mode === 'navigate' ||
        request.headers.get('accept')?.includes('text/html') ||
        url.pathname.endsWith('.html') ||
        url.pathname === '/') {
        const offlineResponse = await caches.match(OFFLINE_PAGE);
        if (offlineResponse) {
            return offlineResponse;
        }
    }

    // Para imágenes, devolver placeholder
    if (request.destination === 'image') {
        return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="#1a1a1a" width="200" height="200"/><text fill="#666" x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="sans-serif" font-size="14">Sin conexión</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
        );
    }

    // Para JSON, devolver objeto vacío
    if (url.pathname.endsWith('.json')) {
        return new Response(JSON.stringify({ offline: true, data: [] }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Respuesta genérica offline
    return new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' }
    });
}

/**
 * Estrategia Stale While Revalidate
 * Devuelve caché inmediatamente y actualiza en segundo plano
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await caches.match(request);

    // Fetch en segundo plano para actualizar caché
    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch((error) => {
            console.warn('[SW] Error actualizando caché:', error);
            return getOfflineFallback(request);
        });

    // Devolver caché si existe, sino esperar fetch o fallback
    return cachedResponse || fetchPromise;
}

/**
 * Evento fetch - Intercepta todas las peticiones
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Solo cachear peticiones GET
    if (request.method !== 'GET') {
        return;
    }

    // Ignorar peticiones a otros dominios que no sean fonts/assets
    if (url.origin !== self.location.origin &&
        !url.hostname.includes('fonts.googleapis.com') &&
        !url.hostname.includes('fonts.gstatic.com') &&
        !url.hostname.includes('fontawesome.com')) {
        return;
    }

    const strategy = getCacheStrategy(url.pathname);

    event.respondWith(
        (async () => {
            switch (strategy) {
                case 'cacheFirst':
                    return cacheFirst(request);
                case 'networkFirst':
                    return networkFirst(request);
                case 'staleWhileRevalidate':
                    return staleWhileRevalidate(request);
                default:
                    return networkFirst(request);
            }
        })()
    );
});

/**
 * Evento message - Comunicación con la página
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_VERSION });
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            event.ports[0].postMessage({ cleared: true });
        });
    }
});

/**
 * Evento de sincronización en segundo plano
 */
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-favorites') {
        event.waitUntil(syncFavorites());
    }
});

/**
 * Sincroniza favoritos cuando hay conexión
 */
async function syncFavorites() {
    // Implementación futura para sincronizar con servidor
    console.log('[SW] Sincronizando favoritos...');
}

/**
 * Notificación push
 */
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();

    const options = {
        body: data.body || 'Nuevo capítulo disponible',
        icon: '/img/icons/icon-192x192.png',
        badge: '/img/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        },
        actions: [
            { action: 'open', title: 'Leer ahora' },
            { action: 'close', title: 'Cerrar' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Grandiel Scan', options)
    );
});

/**
 * Click en notificación
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'open' || !event.action) {
        const url = event.notification.data?.url || '/';
        event.waitUntil(
            clients.openWindow(url)
        );
    }
});
