'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useUserProfile } from '@/components/providers/UserProfileProvider';
import { useFavoritesContext } from '@/components/providers/FavoritesProvider';
import { useHistoryContext } from '@/components/providers/HistoryProvider';

const AVATARS = [
  '/img/avatars/avatar1.svg',
  '/img/avatars/avatar2.svg',
  '/img/avatars/avatar3.svg',
  '/img/avatars/avatar4.svg',
];

type ModalView = 'register' | 'profile' | 'edit';

interface UserModalProps {
  onClose: () => void;
}

export default function UserModal({ onClose }: UserModalProps) {
  const { profile, isLoggedIn, register, updateProfile, logout } = useUserProfile();
  const { favorites } = useFavoritesContext();
  const { history } = useHistoryContext();

  const [view, setView] = useState<ModalView>(isLoggedIn ? 'profile' : 'register');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [email, setEmail] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatar ?? AVATARS[0]);
  const [error, setError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  const validate = (name: string) => {
    if (name.length < 3 || name.length > 20) {
      setError('El nombre debe tener entre 3 y 20 caracteres.');
      return false;
    }
    setError('');
    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!validate(trimmed)) return;
    setRegLoading(true);
    const result = await register(trimmed, selectedAvatar, email);
    setRegLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setRegSuccess(true);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!validate(trimmed)) return;
    updateProfile({ username: trimmed, avatar: selectedAvatar });
    setView('profile');
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const startEdit = () => {
    setUsername(profile?.username ?? '');
    setSelectedAvatar(profile?.avatar ?? AVATARS[0]);
    setError('');
    setView('edit');
  };

  return (
    <div id="user-modal-container" style={{ pointerEvents: 'auto' }}>
      {/* Overlay */}
      <div
        className="user-modal-overlay active"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="user-modal active"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button className="user-modal-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>

        {/* ── REGISTRO ── */}
        {view === 'register' && (
          <>
            {regSuccess ? (
              /* ── Email enviado ── */
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <i className="fas fa-envelope-open-text" style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '1rem' }} aria-hidden="true" />
                <h2 id="modal-title" className="user-modal-title">¡Revisa tu email!</h2>
                <p style={{ marginTop: '0.5rem', opacity: 0.8, fontSize: '0.9rem' }}>
                  Enviamos un enlace a <strong>{email}</strong>.<br />
                  Haz clic en él para activar tu cuenta.
                </p>
                <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', opacity: 0.55 }}>
                  ¿No lo ves? Revisa la carpeta de spam.
                </p>
              </div>
            ) : (
              <>
            <h2 id="modal-title" className="user-modal-title">
              Bienvenido a Grandiel Scan
            </h2>
            <p className="user-modal-subtitle">
              Crea una cuenta para guardar tus favoritos y personalizar tu experiencia.
            </p>

            <form className="user-form" onSubmit={handleRegister}>
              {error && (
                <p style={{ color: 'var(--color-primary)', fontSize: '0.875rem', textAlign: 'center', margin: 0 }}>
                  {error}
                </p>
              )}
              <div className="form-group">
                <label htmlFor="email-input">Correo electrónico</label>
                <input
                  id="email-input"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="username-input">Nombre de usuario</label>
                <input
                  id="username-input"
                  type="text"
                  placeholder="Tu nombre de usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  maxLength={20}
                  required
                  autoComplete="username"
                />
                <span className="form-hint">3–20 caracteres</span>
              </div>

              <div className="form-group">
                <label>Avatar</label>
                <div className="avatar-selector">
                  {AVATARS.map((av, i) => (
                    <button
                      key={av}
                      type="button"
                      className={`avatar-option${selectedAvatar === av ? ' selected' : ''}`}
                      onClick={() => setSelectedAvatar(av)}
                      aria-pressed={selectedAvatar === av}
                      aria-label={`Avatar ${i + 1}`}
                    >
                      <Image src={av} alt={`Avatar ${i + 1}`} width={56} height={56} unoptimized />
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-primary user-submit-btn" disabled={regLoading}>
                {regLoading ? 'Enviando...' : 'Crear Cuenta'}
              </button>
            </form>
              </>
            )}
          </>
        )}

        {/* ── PERFIL ── */}
        {view === 'profile' && profile && (
          <>
            <div className="user-profile-header">
              <Image
                src={profile.avatar}
                alt="Tu avatar"
                width={100}
                height={100}
                className="user-avatar-large"
                unoptimized
              />
              <h2 id="modal-title" className="user-profile-name">
                {profile.username}
              </h2>
              <p className="user-profile-since">
                Usuario desde{' '}
                {new Date(profile.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                })}
              </p>
            </div>

            <div className="user-stats">
              <div className="user-stat">
                <span className="stat-number">{favorites.length}</span>
                <span className="stat-label">Favoritos</span>
              </div>
              <div className="user-stat">
                <span className="stat-number">{history.length}</span>
                <span className="stat-label">Leídos</span>
              </div>
            </div>

            <nav className="user-menu">
              <Link href="/perfil" className="user-menu-item" onClick={onClose}>
                <i className="fas fa-user" aria-hidden="true" /> Ver Perfil
              </Link>
              <button type="button" className="user-menu-item" onClick={startEdit}>
                <i className="fas fa-edit" aria-hidden="true" /> Editar Perfil
              </button>
            </nav>

            <button type="button" className="btn-secondary user-logout-btn" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt" aria-hidden="true" /> Cerrar Sesión
            </button>
          </>
        )}

        {/* ── EDITAR PERFIL ── */}
        {view === 'edit' && profile && (
          <>
            <h2 id="modal-title" className="user-modal-title">
              Editar Perfil
            </h2>

            <form className="user-form" onSubmit={handleSaveEdit}>
              {error && (
                <p style={{ color: 'var(--color-primary)', fontSize: '0.875rem', textAlign: 'center', margin: 0 }}>
                  {error}
                </p>
              )}
              <div className="form-group">
                <label htmlFor="edit-username-input">Nombre de usuario</label>
                <input
                  id="edit-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  maxLength={20}
                  required
                />
              </div>

              <div className="form-group">
                <label>Avatar</label>
                <div className="avatar-selector">
                  {AVATARS.map((av, i) => (
                    <button
                      key={av}
                      type="button"
                      className={`avatar-option${selectedAvatar === av ? ' selected' : ''}`}
                      onClick={() => setSelectedAvatar(av)}
                      aria-pressed={selectedAvatar === av}
                      aria-label={`Avatar ${i + 1}`}
                    >
                      <Image src={av} alt={`Avatar ${i + 1}`} width={56} height={56} unoptimized />
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setView('profile')}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
