import webpush from 'web-push';
import { db } from './db';
import { pushSubscriptions } from './db/schema';
import { eq, inArray } from 'drizzle-orm';

webpush.setVapidDetails(
  `mailto:admin@${process.env.NEXT_PUBLIC_SITE_URL?.replace('https://', '') ?? 'grandielscan.com'}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  icon?: string;
}

/** Envía notificación push a todos los suscriptores. */
export async function sendPushToAll(payload: PushPayload): Promise<void> {
  const subs = await db.select().from(pushSubscriptions);
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
