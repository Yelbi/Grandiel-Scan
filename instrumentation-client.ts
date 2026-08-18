import * as Sentry from '@sentry/nextjs';

// A partir de Next.js 15.3 este archivo sustituye a `sentry.client.config.ts`.
// Next lo carga automáticamente antes de hidratar la app.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,

  // Sin DSN el SDK queda inerte. Solo se reporta en despliegues (production build);
  // NEXT_PUBLIC_SENTRY_DEBUG=true permite probar la integración en local.
  enabled: Boolean(dsn) && (
    process.env.NODE_ENV === 'production' ||
    process.env.NEXT_PUBLIC_SENTRY_DEBUG === 'true'
  ),

  // Etiqueta cada evento con el entorno de Vercel (production / preview / development)
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,

  // Asocia el evento con el commit desplegado para ver el stack trace mapeado
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Porcentaje de transacciones capturadas para performance monitoring (0.0 – 1.0).
  // 0.1 en producción para no agotar la cuota gratuita.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // No enviar IP ni cookies del lector: el sitio no necesita datos personales en Sentry.
  sendDefaultPii: false,

  // Ruido del navegador que no es un fallo de la web (extensiones, bots, redes móviles).
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
    'The play() request was interrupted',
    /^Failed to fetch$/,
    /^NetworkError/,
    /^Load failed$/,
  ],

  beforeSend(event: Sentry.ErrorEvent) {
    // No capturar cancelaciones del usuario (cambiar de página aborta fetches en vuelo)
    const type = event.exception?.values?.[0]?.type;
    if (type === 'AbortError') return null;
    return event;
  },
});

/** Instrumenta las navegaciones del App Router para las trazas de performance. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
