import * as Sentry from '@sentry/nextjs';

// Cargado por `instrumentation.ts` cuando NEXT_RUNTIME === 'nodejs'.
// La integración de Sentry en Vercel expone SENTRY_DSN; NEXT_PUBLIC_SENTRY_DSN
// se acepta como alternativa para no duplicar la variable manualmente.
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,

  enabled: Boolean(dsn) && (
    process.env.NODE_ENV === 'production' ||
    process.env.SENTRY_DEBUG === 'true'
  ),

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  release:     process.env.VERCEL_GIT_COMMIT_SHA,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // El servidor maneja sesiones de Supabase: no enviar cabeceras/cookies a Sentry.
  sendDefaultPii: false,
});
