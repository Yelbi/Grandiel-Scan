'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef } from 'react';
import { useUserProfile } from '@/components/providers/UserProfileProvider';
import { useFavoritesContext } from '@/components/providers/FavoritesProvider';
import { useHistoryContext } from '@/components/providers/HistoryProvider';
import MangaCard from '@/components/manga/MangaCard';
import PushSubscribeButton from '@/components/PushSubscribeButton';
import type { Manga } from '@/lib/types';

const AVATARS = [
  '/img/avatars/avatar1.svg',
  '/img/avatars/avatar2.svg',
  '/img/avatars/avatar3.svg',
  '/img/avatars/avatar4.svg',
];

type Tab = 'favoritos' | 'historial';

function relativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`;
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}

export default function PerfilClient({ mangas }: { mangas: Manga[] }) {
  const { profile, isLoggedIn, loading, register, updateProfile, logout } = useUserProfile();
  const { favorites } = useFavoritesContext();
  const { history, clearHistory } = useHistoryContext();

  const [tab, setTab] = useState<Tab>('favoritos');
  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editError, setEditError] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail]       = useState('');
  const [regAvatar, setRegAvatar]     = useState(AVATARS[0]);
  const [regError, setRegError]       = useState('');
  const [regSuccess, setRegSuccess]   = useState(false);
  const [regLoading, setRegLoading]   = useState(false);

  const regFileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const MAX_AVATAR_BYTES = 1 * 1024 * 1024; // 1 MB

  const readAvatarFile = (file: File, onLoad: (dataUrl: string) => void) => {
    if (file.size > MAX_AVATAR_BYTES) {
      alert('La imagen no puede superar 1 MB. Elige una foto más pequeña.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => onLoad(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleRegPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readAvatarFile(file, setRegAvatar);
  };

  const handleEditPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readAvatarFile(file, setEditAvatar);
  };

  const startEdit = () => {
    setEditUsername(profile!.username);
    setEditAvatar(profile!.avatar);
    setEditError('');
    setEditing(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editUsername.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      setEditError('El nombre debe tener entre 3 y 20 caracteres.');
      return;
    }
    await updateProfile({ username: trimmed, avatar: editAvatar });
    setEditing(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = regUsername.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      setRegError('El nombre debe tener entre 3 y 20 caracteres.');
      return;
    }
    if (!regEmail.trim()) {
      setRegError('El email es obligatorio.');
      return;
    }
    setRegLoading(true);
    setRegError('');
    const result = await register(trimmed, regAvatar, regEmail.trim());
    setRegLoading(false);
    if (result.error) {
      setRegError(result.error);
    } else {
      setRegSuccess(true);
    }
  };

  const favoriteMangas = mangas.filter((m) => favorites.includes(m.id));
  const historyItems = history.map((entry) => ({
    entry,
    manga: mangas.find((m) => m.id === entry.mangaId),
  }));

  /* ─────────────────── LOADING ─────────────────── */
  if (loading) {
    return (
      <div className="curva" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', opacity: 0.5 }} aria-label="Cargando..." />
      </div>
    );
  }

  /* ── Email enviado ── */
  if (regSuccess) {
    return (
      <div className="curva">
        <div className="perfil-guest-layout">
          <div className="perfil-guest-form-card" style={{ textAlign: 'center' }}>
            <i className="fas fa-envelope-open-text" style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: '1rem' }} aria-hidden="true" />
            <h2 className="perfil-guest-form-card__title">¡Revisa tu email!</h2>
            <p style={{ marginTop: '0.75rem', opacity: 0.8 }}>
              Te enviamos un enlace de confirmación a{' '}
              <strong>{regEmail}</strong>.
              <br />Haz clic en el enlace para activar tu cuenta.
            </p>
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', opacity: 0.55 }}>
              ¿No lo ves? Revisa la carpeta de spam.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────── GUEST VIEW ─────────────────── */
  if (!isLoggedIn) {
    return (
      <div className="curva">
        <div className="perfil-guest-layout">
          {/* Left: benefits */}
          <div className="perfil-guest-benefits">
            <div className="perfil-guest-benefits__icon">
              <i className="fas fa-dragon" aria-hidden="true" />
            </div>
            <h1 className="perfil-guest-benefits__title">Únete a Grandiel Scan</h1>
            <p className="perfil-guest-benefits__sub">
              Crea tu cuenta gratuita y desbloquea funciones exclusivas.
            </p>
            <ul className="perfil-benefits-list">
              <li className="perfil-benefit">
                <i className="fas fa-heart" aria-hidden="true" />
                <div>
                  <strong>Guarda tus favoritos</strong>
                  <p>Mantén tu lista de mangas favoritos siempre a mano.</p>
                </div>
              </li>
              <li className="perfil-benefit">
                <i className="fas fa-history" aria-hidden="true" />
                <div>
                  <strong>Historial de lectura</strong>
                  <p>Retoma donde lo dejaste en cualquier momento.</p>
                </div>
              </li>
              <li className="perfil-benefit">
                <i className="fas fa-comments" aria-hidden="true" />
                <div>
                  <strong>Comenta con tu perfil</strong>
                  <p>Deja tus opiniones con tu nombre y avatar.</p>
                </div>
              </li>
              <li className="perfil-benefit">
                <i className="fas fa-user-circle" aria-hidden="true" />
                <div>
                  <strong>Perfil personalizado</strong>
                  <p>Elige tu nombre y avatar entre varias opciones.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Right: form */}
          <div className="perfil-guest-form-card">
            <h2 className="perfil-guest-form-card__title">Crear Cuenta</h2>
            <p className="perfil-guest-form-card__sub">
              Te enviaremos un enlace mágico a tu email. Sin contraseña.
            </p>

            <form className="user-form" onSubmit={handleRegister}>
              {regError && (
                <p className="perfil-form-error">{regError}</p>
              )}
              <div className="form-group">
                <label htmlFor="reg-email">Email</label>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="tu@email.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
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
                <span className="form-hint">3–20 caracteres</span>
              </div>
              <div className="form-group">
                <label>Elige tu avatar</label>
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
                  <button
                    type="button"
                    className={`avatar-option avatar-option--upload${!AVATARS.includes(regAvatar) ? ' selected' : ''}`}
                    onClick={() => regFileRef.current?.click()}
                    aria-label="Subir foto"
                    title="Subir foto propia"
                  >
                    {!AVATARS.includes(regAvatar) ? (
                      <Image src={regAvatar} alt="Foto personalizada" width={56} height={56} unoptimized style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '50%' }} />
                    ) : (
                      <i className="fas fa-camera" aria-hidden="true" />
                    )}
                  </button>
                  <input ref={regFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleRegPhoto} />
                </div>
              </div>
              <button type="submit" className="btn-primary user-submit-btn" disabled={regLoading}>
                {regLoading
                  ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Enviando...</>
                  : <><i className="fas fa-paper-plane" aria-hidden="true" /> Enviar enlace</>
                }
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────── LOGGED-IN VIEW ─────────────────── */
  // Autenticado pero el perfil aún se está creando/cargando desde la BD
  if (isLoggedIn && !profile) {
    return (
      <div className="curva" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', opacity: 0.5 }} aria-label="Configurando perfil..." />
        <p style={{ marginTop: '1rem', opacity: 0.6 }}>Configurando tu perfil...</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="curva">

      {/* ── Banner de perfil ── */}
      <div className="perfil-banner">
        <div className="perfil-banner__glow" aria-hidden="true" />

        <div className="perfil-banner__body">
          {/* Avatar */}
          <div className="perfil-banner__avatar-wrap">
            <Image
              src={profile.avatar}
              alt="Tu avatar"
              width={120}
              height={120}
              className="perfil-banner__avatar"
              unoptimized
            />
          </div>

          {/* Info */}
          <div className="perfil-banner__info">
            <h1 className="perfil-banner__name">{profile.username}</h1>
            <p className="perfil-banner__since">
              <i className="fas fa-calendar-alt" aria-hidden="true" />{' '}
              Miembro desde{' '}
              {new Date(profile.createdAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
              })}
            </p>

            {/* Stats clicables */}
            <div className="perfil-banner__stats">
              <button
                className={`perfil-stat-btn${tab === 'favoritos' ? ' active' : ''}`}
                onClick={() => setTab('favoritos')}
                title="Ver favoritos"
              >
                <span className="perfil-stat-btn__number">{favorites.length}</span>
                <span className="perfil-stat-btn__label">
                  <i className="fas fa-heart" aria-hidden="true" /> Favoritos
                </span>
              </button>
              <div className="perfil-banner__stat-sep" aria-hidden="true" />
              <button
                className={`perfil-stat-btn${tab === 'historial' ? ' active' : ''}`}
                onClick={() => setTab('historial')}
                title="Ver historial"
              >
                <span className="perfil-stat-btn__number">{history.length}</span>
                <span className="perfil-stat-btn__label">
                  <i className="fas fa-book-open" aria-hidden="true" /> Leídos
                </span>
              </button>
            </div>
          </div>

          {/* Acciones */}
          <div className="perfil-banner__actions">
            <button className="perfil-edit-btn" onClick={startEdit}>
              <i className="fas fa-edit" aria-hidden="true" /> Editar Perfil
            </button>
            <PushSubscribeButton />
            <button
              className="perfil-logout-btn"
              onClick={() => { if (confirm('¿Cerrar sesión?')) void logout(); }}
            >
              <i className="fas fa-sign-out-alt" aria-hidden="true" /> Salir
            </button>
          </div>
        </div>
      </div>

      {/* ── Formulario de edición (debajo del banner) ── */}
      {editing && (
        <div className="perfil-edit-card">
          <div className="perfil-edit-card__header">
            <h2 className="perfil-edit-card__title">
              <i className="fas fa-edit" aria-hidden="true" /> Editar Perfil
            </h2>
            <button
              className="perfil-edit-card__close"
              onClick={() => setEditing(false)}
              aria-label="Cerrar edición"
            >
              <i className="fas fa-times" aria-hidden="true" />
            </button>
          </div>

          <form className="user-form" onSubmit={saveEdit}>
            {editError && <p className="perfil-form-error">{editError}</p>}
            <div className="perfil-edit-card__body">
              <div className="form-group">
                <label htmlFor="edit-username">Nombre de usuario</label>
                <input
                  id="edit-username"
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
                  <button
                    type="button"
                    className={`avatar-option avatar-option--upload${!AVATARS.includes(editAvatar) ? ' selected' : ''}`}
                    onClick={() => editFileRef.current?.click()}
                    aria-label="Subir foto"
                    title="Subir foto propia"
                  >
                    {!AVATARS.includes(editAvatar) ? (
                      <Image src={editAvatar} alt="Foto personalizada" width={56} height={56} unoptimized style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '50%' }} />
                    ) : (
                      <i className="fas fa-camera" aria-hidden="true" />
                    )}
                  </button>
                  <input ref={editFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEditPhoto} />
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                <i className="fas fa-check" aria-hidden="true" /> Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="perfil-tabs">
        <button
          className={`perfil-tab${tab === 'favoritos' ? ' active' : ''}`}
          onClick={() => setTab('favoritos')}
        >
          <i className="fas fa-heart" aria-hidden="true" /> Favoritos
          {favorites.length > 0 && (
            <span className="perfil-tab__count">{favorites.length}</span>
          )}
        </button>
        <button
          className={`perfil-tab${tab === 'historial' ? ' active' : ''}`}
          onClick={() => setTab('historial')}
        >
          <i className="fas fa-history" aria-hidden="true" /> Historial
          {history.length > 0 && (
            <span className="perfil-tab__count">{history.length}</span>
          )}
        </button>
      </div>

      {/* ── Favoritos ── */}
      {tab === 'favoritos' && (
        <div className="perfil-section">
          {favoriteMangas.length === 0 ? (
            <div className="perfil-empty">
              <i className="far fa-heart perfil-empty__icon" aria-hidden="true" />
              <p className="perfil-empty__title">Sin favoritos aún</p>
              <p className="perfil-empty__sub">Haz clic en el corazón de cualquier manga para agregarlo aquí.</p>
              <Link href="/mangas" className="perfil-empty__cta">
                <i className="fas fa-images" aria-hidden="true" /> Explorar galería
              </Link>
            </div>
          ) : (
            <>
              <div className="perfil-section__header">
                <span className="results-counter">
                  {favoriteMangas.length} título{favoriteMangas.length !== 1 ? 's' : ''} guardados
                </span>
              </div>
              <div className="mami">
                {favoriteMangas.map((manga) => (
                  <MangaCard key={manga.id} manga={manga} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Historial ── */}
      {tab === 'historial' && (
        <div className="perfil-section">
          {historyItems.length === 0 ? (
            <div className="perfil-empty">
              <i className="fas fa-history perfil-empty__icon" aria-hidden="true" />
              <p className="perfil-empty__title">Sin historial aún</p>
              <p className="perfil-empty__sub">Los capítulos que leas aparecerán aquí.</p>
              <Link href="/mangas" className="perfil-empty__cta">
                <i className="fas fa-images" aria-hidden="true" /> Explorar galería
              </Link>
            </div>
          ) : (
            <>
              <div className="perfil-section__header">
                <span className="results-counter">
                  {historyItems.length} título{historyItems.length !== 1 ? 's' : ''} leídos
                </span>
                <button
                  className="perfil-clear-btn"
                  onClick={() => { if (confirm('¿Borrar todo el historial?')) clearHistory(); }}
                >
                  <i className="fas fa-trash" aria-hidden="true" /> Limpiar
                </button>
              </div>
              <ul className="perfil-history-list">
                {historyItems.map(({ entry, manga }) => (
                  <li key={`${entry.mangaId}-${entry.chapter}`} className="perfil-history-item">
                    <Link href={`/manga/${entry.mangaId}`} className="perfil-history-item__cover">
                      {manga ? (
                        <Image
                          src={manga.image}
                          alt={manga.title}
                          width={72}
                          height={100}
                          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                          loading="lazy"
                          unoptimized={manga.image.startsWith('/img/')}
                        />
                      ) : (
                        <div className="perfil-history-item__cover-placeholder">
                          <i className="fas fa-book" />
                        </div>
                      )}
                    </Link>
                    <div className="perfil-history-item__info">
                      <Link href={`/manga/${entry.mangaId}`} className="perfil-history-item__title">
                        {entry.title}
                      </Link>
                      <span className="perfil-history-item__chapter">
                        <i className="fas fa-bookmark" aria-hidden="true" />
                        {' '}Capítulo {entry.chapter}
                        {entry.page != null && entry.page > 0 && (
                          <> · Pág. {entry.page + 1}</>
                        )}
                      </span>
                      <span className="perfil-history-item__time">
                        <i className="fas fa-clock" aria-hidden="true" /> {relativeDate(entry.timestamp)}
                      </span>
                    </div>
                    <Link
                      href={`/chapter/${entry.mangaId}/${entry.chapter}`}
                      className="perfil-history-item__btn"
                    >
                      <i className="fas fa-play" aria-hidden="true" /> Continuar
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
