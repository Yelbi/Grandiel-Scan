/**
 * Rate limiter de ventana deslizante en memoria.
 * Suficiente para Vercel (warm instances) y entornos de desarrollo.
 * Para multi-instancia distribuida, sustituir por @upstash/ratelimit + Redis.
 */

interface Entry {
  count:     number;
  resetAt:   number;
}

const store = new Map<string, Entry>();

// Limpiar entradas expiradas cada 5 minutos para no acumular memoria
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * @param key       Clave única (ej: `register:${ip}`)
 * @param limit     Número máximo de peticiones por ventana
 * @param windowMs  Duración de la ventana en milisegundos
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/** Extrae la IP del cliente del request de Next.js. */
export function getClientIp(req: Request): string {
  const forwarded = (req as Request & { headers: Headers }).headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}
