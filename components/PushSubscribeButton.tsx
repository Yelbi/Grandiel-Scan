'use client';

import { useEffect, useState } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded.padEnd(padded.length + (4 - (padded.length % 4)) % 4, '='));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Status = 'unsupported' | 'loading' | 'subscribed' | 'unsubscribed';

export default function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? 'subscribed' : 'unsubscribed');
    });
  }, []);

  const subscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });

      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(json),
      });

      setStatus('subscribed');
    } catch {
      // El usuario denegó el permiso u ocurrió un error
    }
  };

  const unsubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;

      await fetch('/api/push/subscribe', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ endpoint: sub.endpoint }),
      });

      await sub.unsubscribe();
      setStatus('unsubscribed');
    } catch {}
  };

  if (status === 'unsupported' || status === 'loading') return null;

  return (
    <button
      className={`push-btn${status === 'subscribed' ? ' push-btn--active' : ''}`}
      onClick={status === 'subscribed' ? unsubscribe : subscribe}
      title={status === 'subscribed' ? 'Desactivar notificaciones' : 'Activar notificaciones'}
    >
      <i
        className={`fas ${status === 'subscribed' ? 'fa-bell-slash' : 'fa-bell'}`}
        aria-hidden="true"
      />
      {status === 'subscribed' ? ' Notificaciones activas' : ' Activar notificaciones'}
    </button>
  );
}
