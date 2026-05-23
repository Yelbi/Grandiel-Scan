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

interface CommentsResponse {
  comments: Comment[];
  page: number;
  hasMore: boolean;
  total: number;
}

interface PostCommentResponse {
  ok: boolean;
  comment: {
    id: number;
    text: string;
    createdAt: string;
    userId: string;
  };
}

export default function MangaComments({
  mangaId,
  chapterNum,
}: {
  mangaId: string;
  chapterNum?: number;
}) {
  const { profile, isLoggedIn } = useUserProfile();

  const [comments, setComments]           = useState<Comment[]>([]);
  const [total, setTotal]                 = useState<number | null>(null);
  const [text, setText]                   = useState('');
  const [error, setError]                 = useState('');
  const [fetchError, setFetchError]       = useState(false);
  const [fetchErrorMsg, setFetchErrorMsg] = useState('');
  const [loading, setLoading]             = useState(true);
  const [submitting, setSubmitting]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deletingId, setDeletingId]       = useState<number | null>(null);
  const [page, setPage]                   = useState(1);
  const [hasMore, setHasMore]             = useState(false);
  const [loadingMore, setLoadingMore]     = useState(false);

  const buildUrl = useCallback((p: number) => {
    return chapterNum !== undefined
      ? `/api/comments/${mangaId}?chapter=${chapterNum}&page=${p}`
      : `/api/comments/${mangaId}?page=${p}`;
  }, [mangaId, chapterNum]);

  const fetchComments = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(buildUrl(1), { signal });
      if (res.ok) {
        const data = await res.json() as CommentsResponse;
        setComments(data.comments);
        setTotal(data.total);
        setPage(1);
        setHasMore(data.hasMore);
        setFetchError(false);
        setFetchErrorMsg('');
      } else {
        setFetchError(true);
        setFetchErrorMsg(`Error ${res.status}: ${res.statusText || 'No se pudo conectar al servidor.'}`);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setFetchError(true);
      setFetchErrorMsg(err instanceof Error ? err.message : 'Error de red.');
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(nextPage));
      if (res.ok) {
        const data = await res.json() as CommentsResponse;
        setComments((prev) => [...prev, ...data.comments]);
        setPage(nextPage);
        setHasMore(data.hasMore);
      }
    } catch {
      // red error — silently ignore, user can retry
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchComments(controller.signal);
    return () => controller.abort();
  }, [fetchComments]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const body: { text: string; chapter?: number } = { text };
      if (chapterNum !== undefined) body.chapter = chapterNum;
      const res = await fetch(`/api/comments/${mangaId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json() as PostCommentResponse;
        const newComment: Comment = {
          id:        data.comment.id,
          text:      data.comment.text,
          createdAt: data.comment.createdAt,
          userId:    data.comment.userId,
          username:  profile!.username,
          avatar:    profile!.avatar,
        };
        setComments((prev) => [newComment, ...prev]);
        setTotal((prev) => (prev !== null ? prev + 1 : 1));
        setText('');
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Error al publicar el comentario.');
      }
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: number) => {
    setDeletingId(commentId);
    try {
      const res = await fetch(`/api/comments/${mangaId}`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ commentId }),
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setTotal((prev) => (prev !== null ? prev - 1 : null));
      }
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const charsLeft = 500 - text.length;

  return (
    <section className="manga-comments">
      <h2 className="manga-comments__title">
        <i className="fas fa-comments" aria-hidden="true" />
        Comentarios
        {total !== null && total > 0 && (
          <span className="manga-comments__count">{total}</span>
        )}
      </h2>

      {/* ── Formulario ── */}
      {isLoggedIn && profile ? (
        <form className="manga-comments__form" onSubmit={submit}>
          {error && (
            <p className="manga-comments__error" role="alert" aria-live="assertive">
              {error}
            </p>
          )}
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
              aria-label="Escribe tu comentario"
            />
          </div>
          <div className="manga-comments__form-footer">
            {/* A-7: only announce when running low on chars */}
            <span
              className="manga-comments__chars"
              aria-live={charsLeft <= 50 ? 'polite' : 'off'}
              aria-atomic="true"
            >
              {text.length}/500
            </span>
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
        <p className="manga-comments__empty" role="status">
          <i className="fas fa-spinner fa-spin" aria-hidden="true" /> Cargando comentarios...
        </p>
      ) : fetchError ? (
        <div className="manga-comments__fetch-error">
          <p><i className="fas fa-exclamation-circle" aria-hidden="true" /> No se pudieron cargar los comentarios.</p>
          {fetchErrorMsg && <p className="manga-comments__fetch-detail">{fetchErrorMsg}</p>}
          <button className="manga-comments__retry" onClick={() => { setLoading(true); void fetchComments(); }}>
            <i className="fas fa-redo" aria-hidden="true" /> Reintentar
          </button>
        </div>
      ) : comments.length === 0 ? (
        <p className="manga-comments__empty">
          <i className="far fa-comment-dots" aria-hidden="true" /> Sé el primero en comentar.
        </p>
      ) : (
        <>
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
                    <time className="manga-comment__time" dateTime={c.createdAt}>
                      {new Date(c.createdAt).toLocaleDateString('es-ES', {
                        year:  'numeric',
                        month: 'short',
                        day:   'numeric',
                      })}
                    </time>
                    {profile?.id === c.userId && (
                      confirmDelete === c.id ? (
                        <span className="manga-comment__confirm-delete">
                          <button
                            className="manga-comment__confirm-yes"
                            onClick={() => void deleteComment(c.id)}
                            disabled={deletingId === c.id}
                            aria-label="Confirmar eliminación"
                          >
                            {deletingId === c.id
                              ? <i className="fas fa-spinner fa-spin" aria-hidden="true" />
                              : <><i className="fas fa-check" aria-hidden="true" /> Eliminar</>
                            }
                          </button>
                          <button
                            className="manga-comment__confirm-no"
                            onClick={() => setConfirmDelete(null)}
                            aria-label="Cancelar eliminación"
                          >
                            <i className="fas fa-times" aria-hidden="true" /> Cancelar
                          </button>
                        </span>
                      ) : (
                        <button
                          className="manga-comment__delete"
                          onClick={() => setConfirmDelete(c.id)}
                          title="Eliminar comentario"
                          aria-label="Eliminar comentario"
                        >
                          <i className="fas fa-trash-alt" aria-hidden="true" />
                        </button>
                      )
                    )}
                  </div>
                  <p className="manga-comment__text">{c.text}</p>
                </div>
              </li>
            ))}
          </ul>

          {hasMore && (
            <div className="manga-comments__load-more">
              <button
                className="btn"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                aria-label="Cargar más comentarios"
              >
                {loadingMore
                  ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Cargando...</>
                  : 'Cargar más comentarios'
                }
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
