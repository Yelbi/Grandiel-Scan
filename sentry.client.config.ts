import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Porcentaje de transacciones capturadas para performance monitoring (0.0 – 1.0).
  // En producción reducir a 0.1 para evitar quota excesiva.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Solo activar en producción para no contaminar errores con ruido de desarrollo.
  enabled: process.env.NODE_ENV === 'production',

  // Agrupa errores de red/fetch bajo el mismo fingerprint para reducir ruido.
  beforeSend(event: Sentry.ErrorEvent) {
    // No capturar errores de cancelación de usuario (AbortError)
    if (event.exception?.values?.[0]?.type === 'AbortError') return null;
    return event;
  },
});
