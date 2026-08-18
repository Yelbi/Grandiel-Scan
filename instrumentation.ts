import * as Sentry from '@sentry/nextjs';

/**
 * Hook de instrumentación de Next.js.
 * Sin este archivo, `sentry.server.config.ts` y `sentry.edge.config.ts` NUNCA se
 * cargan y los errores de servidor/edge no llegan a Sentry.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

/**
 * Captura errores lanzados dentro de Server Components, Route Handlers,
 * generateMetadata, etc. Requerido desde Next.js 15 — sin esto solo se veían
 * los errores del cliente.
 */
export const onRequestError = Sentry.captureRequestError;
