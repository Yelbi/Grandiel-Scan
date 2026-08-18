/**
 * URL pública del sitio, en un único sitio.
 *
 * Antes estaba escrita a mano como 'https://grandielscan.com' en siete archivos.
 * Ese dominio no resuelve: el sitio vive en grandiel-scan-swart.vercel.app, así
 * que el sitemap, el robots.txt y las previsualizaciones de redes sociales
 * apuntaban a un host inexistente.
 *
 * Cascada, de más específico a más general:
 *   1. NEXT_PUBLIC_SITE_URL — el dominio propio, cuando lo haya.
 *   2. La URL de producción que Vercel inyecta sola (requiere tener activado
 *      "Enable access to System Environment Variables", que ya lo está).
 *   3. localhost, para desarrollo.
 *
 * Cuando conectes un dominio propio basta con cambiar NEXT_PUBLIC_SITE_URL en
 * Vercel: no hay que tocar código.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return normalize(explicit);

  // Vercel la expone sin protocolo: "grandiel-scan-swart.vercel.app"
  const vercel = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return normalize(vercel);

  return 'http://localhost:3000';
}

/** Añade https:// si falta y quita la barra final, para poder concatenar sin dudas. */
function normalize(raw: string): string {
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, '');
}

/** URL base sin barra final. Ej: "https://grandiel-scan-swart.vercel.app" */
export const SITE_URL = resolveSiteUrl();

/** Host sin protocolo. Ej: "grandiel-scan-swart.vercel.app" */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');
