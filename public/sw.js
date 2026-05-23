const CACHE_NAME = 'grandiel-v3';

const STATIC_ASSETS = [
  '/manifest.json',
  '/img/logo.jpg',
  '/img/logo.gif',
];

self.addEventListener('install', (event) => {
  // No llamar skipWaiting() automáticamente: el nuevo SW espera hasta que el
  // usuario confirme la actualización desde el banner en SwRegister.tsx.
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

// El cliente envía SKIP_WAITING cuando el usuario hace clic en "Actualizar"
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/_next/')) return;
  // FontAwesome: dejar que el navegador lo maneje directamente vía style-src.
  // Si el SW intercepta y llama fetch(), rige connect-src (no style-src) → bloqueado por CSP.
  if (url.hostname.includes('fontawesome.com')) return;

  // Network-First para páginas HTML
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request) ?? await caches.match('/');
        return cached ?? new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }),
    );
    return;
  }

  // Cache-First para assets estáticos.
  // FontAwesome se excluye del caché: si el CDN externo sirve código malicioso,
  // el SW no lo persiste indefinidamente en el dispositivo del usuario (S-7).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const isSameOrigin = url.origin === self.location.origin;
        const isTrustedFont =
          url.hostname.includes('fonts.googleapis.com') ||
          url.hostname.includes('fonts.gstatic.com');

        if (response.ok && (isSameOrigin || isTrustedFont)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    }),
  );
});
