import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Rate limiter de ventana deslizante respaldado por Postgres.
 * Funciona correctamente en entornos multi-instancia (Vercel serverless).
 * Si la DB no está disponible falla abierto (deja pasar la petición).
 *
 * @param key       Clave única (ej: `register:${ip}`)
 * @param limit     Número máximo de peticiones por ventana
 * @param windowMs  Duración de la ventana en milisegundos
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const resetAtSecs = (Date.now() + windowMs) / 1000;

  try {
    // UPSERT atómico: si la ventana expiró reinicia el contador; si no, lo incrementa.
    const result = await db.execute(sql`
      INSERT INTO rate_limit_store (key, count, reset_at)
      VALUES (
        ${key},
        1,
        to_timestamp(${resetAtSecs})
      )
      ON CONFLICT (key) DO UPDATE
        SET
          count = CASE
            WHEN rate_limit_store.reset_at <= now() THEN 1
            ELSE rate_limit_store.count + 1
          END,
          reset_at = CASE
            WHEN rate_limit_store.reset_at <= now() THEN to_timestamp(${resetAtSecs})
            ELSE rate_limit_store.reset_at
          END
      RETURNING
        count,
        (extract(epoch from reset_at) * 1000)::bigint AS reset_ms
    `);

    const row = result[0] as { count: number | string; reset_ms: number | string };
    const count       = Number(row.count);
    const actualReset = Number(row.reset_ms);

    if (count > limit) {
      return { success: false, remaining: 0, resetAt: actualReset };
    }
    return { success: true, remaining: limit - count, resetAt: actualReset };
  } catch {
    // Si la DB no está disponible se falla abierto para no bloquear usuarios legítimos.
    return { success: true, remaining: limit, resetAt: Date.now() + windowMs };
  }
}

/** Extrae la IP del cliente del request de Next.js.
 *
 * En Vercel, el proxy añade la IP real del cliente al FINAL de x-forwarded-for
 * para que no pueda ser falsificada por el cliente. Se usa la última IP en la
 * cadena, que es la añadida por la infraestructura de Vercel.
 */
export function getClientIp(req: Request): string {
  const forwarded = (req as Request & { headers: Headers }).headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',');
    return parts[parts.length - 1].trim();
  }
  return 'unknown';
}
