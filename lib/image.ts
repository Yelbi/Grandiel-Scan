/**
 * Whitelist única de hosts permitidos para imágenes externas.
 * DEBE coincidir con `remotePatterns` en next.config.ts y con `img-src` en middleware.ts.
 * Si añades un host aquí, actualiza también esos dos sitios.
 */
const EXACT_HOSTS = new Set<string>([
  'dashboard.olympusscans.com',
  'dashboard.olympusbiblioteca.com',
  'media.ikigaimangas.cloud',
  'cdn.arenascan.com',
  'olympusscans.com',
  'olympusbiblioteca.com',
]);

// Hosts permitidos por sufijo (equivale a *.host del CSP/remotePatterns).
// El sufijo incluye el punto para evitar que 'evilolympusscans.com' coincida.
const SUFFIX_HOSTS: readonly string[] = [
  '.supabase.co',
  '.olympusscans.com',
  '.olympusbiblioteca.com',
];

/** True si el host (sin protocolo) está en la whitelist. */
function isHostAllowed(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (EXACT_HOSTS.has(lower)) return true;
  return SUFFIX_HOSTS.some((s) => lower.endsWith(s));
}

/**
 * Decide si una URL de imagen puede pasar por el optimizer de Next.js (`/_next/image`).
 * - Rutas locales (`/img/...`) → false (el optimizer no aporta sobre SVG/PNG locales pequeños).
 * - URLs HTTPS con host whitelisteado → true.
 * - Cualquier otra cosa → false (la imagen se sirve cruda con `unoptimized`).
 *
 * Esto evita el bug de que el optimizer rechace hosts no listados en `remotePatterns`
 * y deje la portada sin renderizar en producción.
 */
export function shouldOptimize(src: string | null | undefined): boolean {
  if (!src) return false;
  if (!src.startsWith('http')) return false; // rutas locales o data: / blob:
  try {
    const url = new URL(src);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return isHostAllowed(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Valida que una URL sea aceptable como `manga.image` en el backend.
 * Permite:
 *   - Rutas locales que empiecen por `/` (servidas desde `public/`).
 *   - HTTPS hacia un host whitelisteado.
 *
 * Usar en POST/PATCH de admin para evitar que se guarden URLs que después
 * fallarán silenciosamente en el frontend.
 */
export function isValidImageUrl(src: unknown): src is string {
  if (typeof src !== 'string') return false;
  const trimmed = src.trim();
  if (!trimmed) return false;
  // Rutas locales relativas a `public/`
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  // URLs absolutas: solo HTTPS y host whitelisteado
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return false;
    return isHostAllowed(url.hostname);
  } catch {
    return false;
  }
}

/** Lista de hosts permitidos (para mostrar mensajes de error útiles en admin). */
export const ALLOWED_IMAGE_HOSTS_HUMAN = [
  ...Array.from(EXACT_HOSTS),
  ...SUFFIX_HOSTS.map((s) => `*${s}`),
].join(', ');
