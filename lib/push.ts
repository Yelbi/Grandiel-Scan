import webpush from 'web-push';
import { db } from './db';
import { pushSubscriptions, favorites } from './db/schema';
import { eq, inArray } from 'drizzle-orm';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const siteHost = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://grandielscan.com')
  .replace(/^https?:\/\//, '');

let pushReady = false;

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(
      `mailto:admin@${siteHost}`,
      vapidPublicKey,
      vapidPrivateKey,
    );
    pushReady = true;
  } catch (err) {
    console.error('[push] VAPID config inválida:', err);
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  icon?: string;
}

/**
 * Envía notificación push solo a los suscriptores que tienen
 * el manga en favoritos. Limpia suscripciones expiradas.
 */
export async function notifyFavoriteUsers(
  mangaId: string,
  payload: PushPayload,
): Promise<void> {
  if (!pushReady) return;

  // 1. Usuarios que tienen este manga en favoritos
  const favRows = await db
    .select({ userId: favorites.userId })
    .from(favorites)
    .where(eq(favorites.mangaId, mangaId));

  if (favRows.length === 0) return;

  const userIds = favRows.map((r) => r.userId);

  // 2. Suscripciones push de esos usuarios
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds));

  if (subs.length === 0) return;

  const message = JSON.stringify(payload);
  const dead: number[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message,
        );
      } catch (err: unknown) {
        // 404/410 = suscripción expirada, limpiar
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(sub.id);
      }
    }),
  );

  if (dead.length > 0) {
    await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, dead));
  }
}
