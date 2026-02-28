'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useUserProfile } from '@/components/providers/UserProfileProvider';

interface Comment {
  id: string;
  name: string;
  avatar: string | null;
  text: string;
  timestamp: number;
}

const storageKey = (mangaId: string) => `grandiel_comments_${mangaId}`;
const MAX = 50;

export default function MangaComments({ mangaId }: { mangaId: string }) {
  const { profile, isLoggedIn } = useUserProfile();
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(storageKey(mangaId));
      if (stored) setComments(JSON.parse(stored) as Comment[]);
    } catch {}
  }, [mangaId]);

  // Pre-fill name from profile
  useEffect(() => {
    if (isLoggedIn && profile) setName(profile.username);
  }, [isLoggedIn, profile]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const displayName = isLoggedIn ? profile!.username : name.trim();
    if (!displayName || !text.trim()) {
      setError('Por favor completa tu nombre y comentario.');
      return;
    }
    const comment: Comment = {
      id: Date.now().toString(),
      name: displayName.slice(0, 50),
      avatar: isLoggedIn ? profile!.avatar : null,
      text: text.trim().slice(0, 500),
      timestamp: Date.now(),
    };
    const updated = [comment, ...comments].slice(0, MAX);
    setComments(updated);
    try {
      localStorage.setItem(storageKey(mangaId), JSON.stringify(updated));
    } catch {}
    setText('');
    if (!isLoggedIn) setName('');
    setError('');
  };

  if (!mounted) return null;

  return (
    <section className="manga-comments">
      <h2 className="manga-comments__title">
        <i className="fas fa-comments" aria-hidden="true" />
        Comentarios
        {comments.length > 0 && (
          <span className="manga-comments__count">{comments.length}</span>
        )}
      </h2>

      <form className="manga-comments__form" onSubmit={submit}>
        {error && <p className="manga-comments__error">{error}</p>}
        <div className="manga-comments__fields">
          {isLoggedIn ? (
            <div className="manga-comments__user-info">
              <Image
                src={profile!.avatar}
                alt="Tu avatar"
                width={32}
                height={32}
                className="manga-comments__user-avatar"
                unoptimized
              />
              <span className="manga-comments__user-name">{profile!.username}</span>
            </div>
          ) : (
            <input
              className="manga-comments__input"
              type="text"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          )}
          <textarea
            className="manga-comments__textarea"
            placeholder="¿Qué te pareció? Escribe tu comentario..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </div>
        <div className="manga-comments__form-footer">
          <span className="manga-comments__chars">{text.length}/500</span>
          <button type="submit" className="manga-comments__submit">
            <i className="fas fa-paper-plane" aria-hidden="true" /> Comentar
          </button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="manga-comments__empty">
          <i className="far fa-comment-dots" aria-hidden="true" /> Sé el primero en comentar.
        </p>
      ) : (
        <ul className="manga-comments__list">
          {comments.map((c) => (
            <li key={c.id} className="manga-comment">
              <div className="manga-comment__avatar" aria-hidden="true">
                {c.avatar ? (
                  <Image
                    src={c.avatar}
                    alt={c.name}
                    width={36}
                    height={36}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    unoptimized
                  />
                ) : (
                  c.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="manga-comment__body">
                <div className="manga-comment__header">
                  <span className="manga-comment__name">{c.name}</span>
                  <time className="manga-comment__time">
                    {new Date(c.timestamp).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
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
