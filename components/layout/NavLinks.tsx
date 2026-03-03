'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const NAV_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/mangas', label: 'Galería' },
  { href: '/actualizaciones', label: 'Novedades' },
] as const;

export default function NavLinks() {
  const pathname = usePathname();
  const [open, setOpen]       = useState(false);
  const [mounted, setMounted] = useState(false);

  const close = () => setOpen(false);

  // Tras hidratación, marcar como montado para activar el portal
  useEffect(() => { setMounted(true); }, []);

  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // El drawer y el overlay se renderizan en <body> (portal) para que
  // nunca sean descendientes del <nav>. Esto evita que backdrop-filter
  // y transform del nav creen un nuevo containing-block para position:fixed,
  // lo que causaba desbordamiento horizontal (espacio blanco).
  const drawer = (
    <>
      {open && (
        <div className="nav-overlay" onClick={close} aria-hidden="true" />
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

  return (
    <>
      {/* El botón permanece dentro del <nav> para su layout */}
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

      {/* Tras hidratación: portal a body. Antes: inline (SSR/hidratación sin mismatch) */}
      {mounted ? createPortal(drawer, document.body) : drawer}
    </>
  );
}
