'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { useUserProfile } from '@/components/providers/UserProfileProvider';

interface Comment {
  id: number;
  text: string;
  createdAt: string;
  userId: string;
  username: string;
  avatar: string;
}

export default function MangaComments({
  mangaId,
  chapterNum,
}: {
  mangaId: string;
  chapterNum?: number;
}) {
  const { profile, isLoggedIn } = useUserProfile();

  const [comments, setComments]     = useState<Comment[]>([]);
  const [text, setText]             = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const apiUrl = chapterNum !== undefined
    ? `/api/comments/${mangaId}?chapter=${chapterNum}`
    : `/api/comments/${mangaId}`;

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(apiUrl);
      if (res.ok) setComments(await res.json() as Comment[]);
    } catch {
      // fallo silencioso — los comentarios son opcionales
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => { void fetchComments(); }, [fetchComments]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    setError('');

    const body: { text: string; chapter?: number } = { text };
    if (chapterNum !== undefined) body.chapter = chapterNum;

    const res = await fetch(`/api/comments/${mangaId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    if (res.ok) {
      setText('');
      await fetchComments();
    } else {
      const data = await res.json() as { error?: string };
      setError(data.error ?? 'Error al publicar el comentario.');
    }

    setSubmitting(false);
  };

  const deleteComment = async (commentId: number) => {
    if (!confirm('¿Eliminar este comentario?')) return;

    const res = await fetch(`/api/comments/${mangaId}`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ commentId }),
    });

    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  };

  return (
    <section className="manga-comments">
      <h2 className="manga-comments__title">
        <i className="fas fa-comments" aria-hidden="true" />
        Comentarios
        {comments.length > 0 && (
          <span className="manga-comments__count">{comments.length}</span>
        )}
      </h2>

      {/* ── Formulario ── */}
      {isLoggedIn && profile ? (
        <form className="manga-comments__form" onSubmit={submit}>
          {error && <p className="manga-comments__error">{error}</p>}
          <div className="manga-comments__fields">
            <div className="manga-comments__user-info">
              <Image
                src={profile.avatar}
                alt="Tu avatar"
                width={32}
                height={32}
                className="manga-comments__user-avatar"
                unoptimized
              />
              <span className="manga-comments__user-name">{profile.username}</span>
            </div>
            <textarea
              className="manga-comments__textarea"
              placeholder="¿Qué te pareció? Escribe tu comentario..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={submitting}
            />
          </div>
          <div className="manga-comments__form-footer">
            <span className="manga-comments__chars">{text.length}/500</span>
            <button
              type="submit"
              className="manga-comments__submit"
              disabled={submitting || !text.trim()}
            >
              {submitting
                ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Publicando...</>
                : <><i className="fas fa-paper-plane" aria-hidden="true" /> Comentar</>
              }
            </button>
          </div>
        </form>
      ) : (
        <p className="manga-comments__login-prompt">
          <i className="fas fa-lock" aria-hidden="true" />{' '}
          <a href="/perfil">Inicia sesión</a> para dejar un comentario.
        </p>
      )}

      {/* ── Lista ── */}
      {loading ? (
        <p className="manga-comments__empty">
          <i className="fas fa-spinner fa-spin" aria-hidden="true" /> Cargando comentarios...
        </p>
      ) : comments.length === 0 ? (
        <p className="manga-comments__empty">
          <i className="far fa-comment-dots" aria-hidden="true" /> Sé el primero en comentar.
        </p>
      ) : (
        <ul className="manga-comments__list">
          {comments.map((c) => (
            <li key={c.id} className="manga-comment">
              <div className="manga-comment__avatar" aria-hidden="true">
                <Image
                  src={c.avatar}
                  alt={c.username}
                  width={36}
                  height={36}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  unoptimized
                />
              </div>
              <div className="manga-comment__body">
                <div className="manga-comment__header">
                  <span className="manga-comment__name">{c.username}</span>
                  <time className="manga-comment__time">
                    {new Date(c.createdAt).toLocaleDateString('es-ES', {
                      year:  'numeric',
                      month: 'short',
                      day:   'numeric',
                    })}
                  </time>
                  {profile?.id === c.userId && (
                    <button
                      className="manga-comment__delete"
                      onClick={() => void deleteComment(c.id)}
                      title="Eliminar comentario"
                      aria-label="Eliminar comentario"
                    >
                      <i className="fas fa-trash-alt" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <p className="manga-comment__text">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
