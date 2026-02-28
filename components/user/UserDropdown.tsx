'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useUserProfile } from '@/components/providers/UserProfileProvider';

export default function UserDropdown() {
  const { profile, isLoggedIn, logout } = useUserProfile();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  if (!isLoggedIn) {
    return (
      <Link href="/perfil" className="user-nav-btn" aria-label="Crear cuenta / Ingresar">
        <i className="fas fa-user-circle" aria-hidden="true" />
        <span>Ingresar</span>
      </Link>
    );
  }

  return (
    <div className="user-dropdown" ref={ref}>
      <button
        type="button"
        className="user-nav-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Menú de ${profile!.username}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Image
          src={profile!.avatar}
          alt="Tu avatar"
          width={28}
          height={28}
          className="user-avatar-small"
          unoptimized
        />
        <span>{profile!.username}</span>
        <i
          className={`fas fa-chevron-down user-dropdown__caret${open ? ' user-dropdown__caret--open' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="user-dropdown__menu" role="menu">
          <Link
            href="/perfil"
            className="user-dropdown__item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <i className="fas fa-user" aria-hidden="true" />
            Ver Perfil
          </Link>
          <Link
            href="/favoritos"
            className="user-dropdown__item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <i className="fas fa-heart" aria-hidden="true" />
            Favoritos
          </Link>
          <Link
            href="/historial"
            className="user-dropdown__item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <i className="fas fa-history" aria-hidden="true" />
            Historial
          </Link>
          <div className="user-dropdown__divider" aria-hidden="true" />
          <button
            type="button"
            className="user-dropdown__item user-dropdown__item--danger"
            role="menuitem"
            onClick={() => { logout(); setOpen(false); }}
          >
            <i className="fas fa-sign-out-alt" aria-hidden="true" />
            Salir
          </button>
        </div>
      )}
    </div>
  );
}
