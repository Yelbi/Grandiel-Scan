'use client';

import { useEffect } from 'react';

export default function ViewTracker({ mangaId }: { mangaId: string }) {
  useEffect(() => {
    // Deduplicar por sesión de navegador (sessionStorage) + deduplicación por IP en servidor
    const key = `viewed_${mangaId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    fetch(`/api/manga/${mangaId}/view`, { method: 'POST' }).catch(() => {});
  // Solo al montar — mangaId es estable dentro de la misma página
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
