import * as Sentry from '@sentry/nextjs';

// Cargado por `instrumentation.ts` cuando NEXT_RUNTIME === 'edge'.
// Cubre `proxy.ts`, donde vive la CSP, el refresco de sesión y el Basic Auth de admin.
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

  sendDefaultPii: false,
});
