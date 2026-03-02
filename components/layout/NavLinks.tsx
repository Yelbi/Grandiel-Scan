'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const NAV_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/mangas', label: 'Galería' },
  { href: '/actualizaciones', label: 'Novedades' },
] as const;

export default function NavLinks() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  // Lock body scroll while drawer is open (prevents background scroll on mobile)
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        className={`nav-hamburger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
        aria-controls="nav-list"
        suppressHydrationWarning
      >
        <span />
        <span />
        <span />
      </button>

      {open && (
        <div
          className="nav-overlay"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <ul id="nav-list" className={`list${open ? ' is-open' : ''}`}>
        {NAV_LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              onClick={close}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
