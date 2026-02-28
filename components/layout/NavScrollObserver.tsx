'use client';

import { useEffect } from 'react';

export default function NavScrollObserver() {
  useEffect(() => {
    const nav = document.querySelector('nav.alpha') as HTMLElement | null;
    if (!nav) return;

    const handler = () => {
      nav.classList.toggle('scrolled', window.scrollY > 10);
    };

    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return null;
}
