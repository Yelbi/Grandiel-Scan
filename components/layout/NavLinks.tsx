'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/mangas', label: 'Galería' },
  { href: '/actualizaciones', label: 'Novedades' },
] as const;

export default function NavLinks() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      <button
        className={`nav-hamburger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
        aria-controls="nav-list"
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
