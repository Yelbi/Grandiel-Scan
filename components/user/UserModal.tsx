'use client';

import { useEffect, useState } from 'react';
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

type ModalView = 'register' | 'login' | 'profile' | 'edit' | 'link-email';

interface UserModalProps {
  onClose: () => void;
}

export default function UserModal({ onClose }: UserModalProps) {
  const { profile, isLoggedIn, register, login, linkEmail, updateProfile, logout } = useUserProfile();
  const { favorites } = useFavoritesContext();
  const { history } = useHistoryContext();

  const [view, setView] = useState<ModalView>(isLoggedIn ? 'profile' : 'register');

  // Cambiar a perfil automáticamente al iniciar sesión
  useEffect(() => {
    if (isLoggedIn && profile && (view === 'register' || view === 'login')) {
      setView('profile');
    }
  }, [isLoggedIn, profile, view]);

  // ── Registro ──
  const [regUsername, setRegUsername]           = useState('');
  const [regPassword, setRegPassword]           = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regAvatar, setRegAvatar]               = useState(AVATARS[0]);
  const [regError, setRegError]                 = useState('');
  const [regLoading, setRegLoading]             = useState(false);

  // ── Login ──
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError]       = useState('');
  const [loginLoading, setLoginLoading]   = useState(false);

  // ── Edit ──
  const [editUsername, setEditUsername]   = useState('');
  const [editAvatar, setEditAvatar]       = useState(AVATARS[0]);
  const [editError, setEditError]         = useState('');

  // ── Link email ──
  const [linkEmailVal, setLinkEmailVal]   = useState('');
  const [linkEmailErr, setLinkEmailErr]   = useState('');
  const [linkEmailOk, setLinkEmailOk]     = useState(false);
  const [linkLoading, setLinkLoading]     = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = regUsername.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      setRegError('El nombre debe tener entre 3 y 20 caracteres.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setRegError('Solo letras, números y guiones bajos (_).');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      setRegError('Las contraseñas no coinciden.');
      return;
    }
    setRegLoading(true);
    setRegError('');
    const result = await register(trimmed, regPassword, regAvatar);
    setRegLoading(false);
    if (result.error) setRegError(result.error);
    // Si no hay error, isLoggedIn cambiará y el useEffect cambiará la vista a 'profile'
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim()) { setLoginError('El usuario es obligatorio.'); return; }
    if (!loginPassword) { setLoginError('La contraseña es obligatoria.'); return; }
    setLoginLoading(true);
    setLoginError('');
    const result = await login(loginUsername.trim(), loginPassword);
    setLoginLoading(false);
    if (result.error) setLoginError(result.error);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editUsername.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      setEditError('El nombre debe tener entre 3 y 20 caracteres.');
      return;
    }
    updateProfile({ username: trimmed, avatar: editAvatar });
    setView('profile');
  };

  const handleLinkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = linkEmailVal.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setLinkEmailErr('Ingresa un email válido.');
      return;
    }
    setLinkLoading(true);
    setLinkEmailErr('');
    const result = await linkEmail(trimmed);
    setLinkLoading(false);
    if (result.error) setLinkEmailErr(result.error);
    else setLinkEmailOk(true);
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const startEdit = () => {
    setEditUsername(profile?.username ?? '');
    setEditAvatar(profile?.avatar ?? AVATARS[0]);
    setEditError('');
    setView('edit');
  };

  return (
    <div id="user-modal-container" style={{ pointerEvents: 'auto' }}>
      {/* Overlay */}
      <div className="user-modal-overlay active" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div className="user-modal active" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="user-modal-close" onClick={onClose} aria-label="Cerrar">×</button>

        {/* ── REGISTRO / LOGIN ── */}
        {(view === 'register' || view === 'login') && (
          <>
            {/* Tabs */}
            <div className="perfil-auth-tabs" style={{ marginBottom: '1rem' }}>
              <button
                type="button"
                className={`perfil-auth-tab${view === 'register' ? ' active' : ''}`}
                onClick={() => { setView('register'); setRegError(''); setLoginError(''); }}
              >
                Crear Cuenta
              </button>
              <button
                type="button"
                className={`perfil-auth-tab${view === 'login' ? ' active' : ''}`}
                onClick={() => { setView('login'); setRegError(''); setLoginError(''); }}
              >
                Iniciar Sesión
              </button>
            </div>

            {/* ── Formulario de Registro ── */}
            {view === 'register' && (
              <form className="user-form" onSubmit={handleRegister}>
                {regError && (
                  <p style={{ color: 'var(--color-primary)', fontSize: '0.875rem', textAlign: 'center', margin: 0 }}>
                    {regError}
                  </p>
                )}
                <div className="form-group">
                  <label htmlFor="reg-username">Nombre de usuario</label>
                  <input
                    id="reg-username"
                    type="text"
                    placeholder="Ej: MangaLover99"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    minLength={3}
                    maxLength={20}
                    required
                    autoComplete="username"
                  />
                  <span className="form-hint">3–20 caracteres, solo letras, números y _</span>
                </div>
                <div className="form-group">
                  <label htmlFor="reg-password">Contraseña</label>
                  <input
                    id="reg-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-password-confirm">Confirmar contraseña</label>
                  <input
                    id="reg-password-confirm"
                    type="password"
                    placeholder="Repite tu contraseña"
                    value={regPasswordConfirm}
                    onChange={(e) => setRegPasswordConfirm(e.target.value)}
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="form-group">
                  <label>Avatar</label>
                  <div className="avatar-selector">
                    {AVATARS.map((av, i) => (
                      <button
                        key={av}
                        type="button"
                        className={`avatar-option${regAvatar === av ? ' selected' : ''}`}
                        onClick={() => setRegAvatar(av)}
                        aria-pressed={regAvatar === av}
                        aria-label={`Avatar ${i + 1}`}
                      >
                        <Image src={av} alt={`Avatar ${i + 1}`} width={56} height={56} unoptimized />
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn-primary user-submit-btn" disabled={regLoading}>
                  {regLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </button>
              </form>
            )}

            {/* ── Formulario de Login ── */}
            {view === 'login' && (
              <form className="user-form" onSubmit={handleLogin}>
                {loginError && (
                  <p style={{ color: 'var(--color-primary)', fontSize: '0.875rem', textAlign: 'center', margin: 0 }}>
                    {loginError}
                  </p>
                )}
                <div className="form-group">
                  <label htmlFor="login-username">Nombre de usuario</label>
                  <input
                    id="login-username"
                    type="text"
                    placeholder="Tu nombre de usuario"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="login-password">Contraseña</label>
                  <input
                    id="login-password"
                    type="password"
                    placeholder="Tu contraseña"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <button type="submit" className="btn-primary user-submit-btn" disabled={loginLoading}>
                  {loginLoading ? 'Ingresando...' : 'Iniciar Sesión'}
                </button>
              </form>
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
              <h2 id="modal-title" className="user-profile-name">{profile.username}</h2>
              <p className="user-profile-since">
                Usuario desde{' '}
                {new Date(profile.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                })}
              </p>
              {profile.email ? (
                <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.25rem' }}>
                  <i className="fas fa-envelope" aria-hidden="true" /> {profile.email}
                </p>
              ) : (
                <button
                  type="button"
                  style={{ fontSize: '0.8rem', opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', marginTop: '0.25rem', padding: 0 }}
                  onClick={() => setView('link-email')}
                >
                  <i className="fas fa-link" aria-hidden="true" /> Enlazar email
                </button>
              )}
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
            <h2 id="modal-title" className="user-modal-title">Editar Perfil</h2>
            <form className="user-form" onSubmit={handleSaveEdit}>
              {editError && (
                <p style={{ color: 'var(--color-primary)', fontSize: '0.875rem', textAlign: 'center', margin: 0 }}>
                  {editError}
                </p>
              )}
              <div className="form-group">
                <label htmlFor="edit-username-input">Nombre de usuario</label>
                <input
                  id="edit-username-input"
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
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
                      className={`avatar-option${editAvatar === av ? ' selected' : ''}`}
                      onClick={() => setEditAvatar(av)}
                      aria-pressed={editAvatar === av}
                      aria-label={`Avatar ${i + 1}`}
                    >
                      <Image src={av} alt={`Avatar ${i + 1}`} width={56} height={56} unoptimized />
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setView('profile')}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </>
        )}

        {/* ── ENLAZAR EMAIL ── */}
        {view === 'link-email' && (
          <>
            <h2 id="modal-title" className="user-modal-title">Enlazar Email</h2>
            <p style={{ fontSize: '0.85rem', opacity: 0.65, marginBottom: '1rem' }}>
              Asocia tu email a la cuenta. No se usará para iniciar sesión.
            </p>
            {linkEmailOk ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '2rem', color: 'var(--accent)', marginBottom: '0.75rem' }} aria-hidden="true" />
                <p>Email enlazado correctamente.</p>
                <button type="button" className="btn-secondary" style={{ marginTop: '1rem' }} onClick={() => setView('profile')}>
                  Volver
                </button>
              </div>
            ) : (
              <form className="user-form" onSubmit={handleLinkEmail}>
                {linkEmailErr && (
                  <p style={{ color: 'var(--color-primary)', fontSize: '0.875rem', textAlign: 'center', margin: 0 }}>
                    {linkEmailErr}
                  </p>
                )}
                <div className="form-group">
                  <label htmlFor="link-email-input">Correo electrónico</label>
                  <input
                    id="link-email-input"
                    type="email"
                    placeholder="tu@email.com"
                    value={linkEmailVal}
                    onChange={(e) => setLinkEmailVal(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setView('profile')}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" disabled={linkLoading}>
                    {linkLoading ? 'Guardando...' : 'Enlazar'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
