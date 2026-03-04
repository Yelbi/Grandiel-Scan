const CACHE_NAME = 'grandiel-v2';

// Recursos estáticos a pre-cachear
const STATIC_ASSETS = [
  '/',
  '/mangas',
  '/actualizaciones',
  '/manifest.json',
  '/img/logo.jpg',
  '/img/logo.gif',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

/* ── Push notifications ── */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Grandiel Scan', {
      body:  data.body ?? '',
      icon:  data.icon ?? '/img/logo.jpg',
      badge: '/img/logo.jpg',
      data:  { url: data.url ?? '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url === url && 'focus' in c);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    }),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo manejar peticiones GET
  if (request.method !== 'GET') return;

  // Estrategia Network-First para páginas HTML (siempre contenido fresco)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/') ?? fetch(request)),
    );
    return;
  }

  // Estrategia Cache-First para assets estáticos (imágenes, fuentes, CSS, JS)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Solo cachear respuestas válidas de mismo origen o CDN confiable
        if (
          response.ok &&
          (request.url.startsWith(self.location.origin) ||
            request.url.includes('fonts.googleapis.com') ||
            request.url.includes('fonts.gstatic.com') ||
            request.url.includes('fontawesome.com'))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    }),
  );
});
