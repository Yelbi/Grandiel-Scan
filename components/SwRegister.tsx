'use client';

import { useEffect, useState } from 'react';

export default function SwRegister() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.update().catch(() => {});

      // Detectar un nuevo SW que termina de instalarse mientras hay uno activo
      reg.addEventListener('updatefound', () => {
        const incoming = reg.installing;
        if (!incoming) return;
        incoming.addEventListener('statechange', () => {
          if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });
    }).catch(() => {});
  }, []);

  const handleUpdate = () => {
    // Recargar solo cuando el SW nuevo ya controla la página. Recargar de
    // inmediato tras el postMessage era una carrera: la recarga solía ganar y
    // el usuario volvía a ver la versión antigua tras pulsar "Actualizar".
    let reloaded = false;
    const reload = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
    // Red de seguridad por si el SW no llega a activarse (p. ej. otra pestaña abierta).
    setTimeout(reload, 3000);

    navigator.serviceWorker.ready.then((reg) => {
      // Indicar al SW en espera que tome el control
      reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
    }).catch(reload);
  };

  if (!updateReady) return null;

  return (
    <div className="sw-update-banner" role="status" aria-live="polite">
      <span className="sw-update-banner__text">Nueva versión disponible</span>
      <button className="sw-update-banner__btn" onClick={handleUpdate}>
        Actualizar
      </button>
      <button
        className="sw-update-banner__dismiss"
        onClick={() => setUpdateReady(false)}
        aria-label="Descartar actualización"
      >
        ×
      </button>
    </div>
  );
}
