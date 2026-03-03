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
  const [open, setOpen]           = useState(false);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);

  const close = () => setOpen(false);

  // Portal solo en móvil: en desktop el .list vive dentro del nav (flex item).
  // En móvil el .list se mueve a <body> para que backdrop-filter/transform
  // del nav no creen un nuevo containing-block para position:fixed.
  useEffect(() => {
    const update = () =>
      setPortalTarget(window.innerWidth <= 768 ? document.body : null);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

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

      {portalTarget ? createPortal(drawer, portalTarget) : drawer}
    </>
  );
}
