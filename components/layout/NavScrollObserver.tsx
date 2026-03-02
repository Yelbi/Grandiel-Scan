'use client';

import { useEffect } from 'react';

export default function NavScrollObserver() {
  useEffect(() => {
    const nav = document.querySelector('nav.alpha') as HTMLElement | null;
    if (!nav) return;

    let lastScrollY = 0;

    const handler = () => {
      const scrollY = window.scrollY;

      // Glassmorphism on scroll
      nav.classList.toggle('scrolled', scrollY > 10);

      // Auto-hide: near top always show
      if (scrollY < 80) {
        nav.classList.remove('nav-hidden');
        document.body.classList.remove('nav-hidden');
      } else if (scrollY > lastScrollY + 4) {
        // Scrolling down — hide nav
        nav.classList.add('nav-hidden');
        document.body.classList.add('nav-hidden');
      } else if (scrollY < lastScrollY - 4) {
        // Scrolling up — show nav
        nav.classList.remove('nav-hidden');
        document.body.classList.remove('nav-hidden');
      }

      lastScrollY = scrollY;
    };

    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return null;
}
