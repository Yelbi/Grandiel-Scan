'use client';

import { useState } from 'react';

const TYPES = [
  { value: 'suggestion', label: 'Sugerencia', icon: '💡' },
  { value: 'complaint',  label: 'Queja',      icon: '🚨' },
] as const;

export default function FeedbackForm() {
  const [type, setType]               = useState<'suggestion' | 'complaint'>('suggestion');
  const [description, setDescription] = useState('');
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);
  const [error, setError]             = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = description.trim();
    if (trimmed.length < 10) {
      setError('El mensaje debe tener al menos 10 caracteres.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, description: trimmed }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? 'Error al enviar.'); return; }
      setSuccess(true);
      setDescription('');
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="feedback-success">
        <svg viewBox="0 0 24 24" width="2.5rem" height="2.5rem" fill="none" stroke="var(--color-success, #22c55e)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <p>¡Mensaje enviado! Gracias por tu {type === 'suggestion' ? 'sugerencia' : 'queja'}.</p>
        <button
          className="feedback-success__again"
          onClick={() => setSuccess(false)}
        >
          Enviar otro
        </button>
      </div>
    );
  }

  return (
    <form className="feedback-form" onSubmit={handleSubmit}>
      {/* Selector de tipo */}
      <div className="feedback-type-selector">
        {TYPES.map(({ value, label, icon }) => (
          <button
            key={value}
            type="button"
            className={`feedback-type-btn${type === value ? ' active' : ''}`}
            onClick={() => setType(value)}
            aria-pressed={type === value}
          >
            <span className="feedback-type-btn__icon">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {error && <p className="report-modal__error">{error}</p>}

      <div className="form-group">
        <label htmlFor="feedback-desc">
          {type === 'suggestion'
            ? '¿Qué mejorarías o añadirías?'
            : '¿Qué problema has tenido?'}
        </label>
        <textarea
          id="feedback-desc"
          className="feedback-textarea"
          placeholder={
            type === 'suggestion'
              ? 'Ej: Me gustaría que hubiera un modo de lectura doble página...'
              : 'Ej: El capítulo X del manga Y no carga desde hace...'
          }
          rows={4}
          maxLength={500}
          value={description}
          onChange={(e) => { setDescription(e.target.value); setError(''); }}
          required
        />
        <span className="feedback-char-count">{description.trim().length}/500</span>
      </div>

      <button
        type="submit"
        className="btn-primary"
        disabled={loading || description.trim().length < 10}
        style={{ alignSelf: 'flex-end' }}
      >
        {loading ? (
          <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Enviando...</>
        ) : (
          <><i className="fas fa-paper-plane" aria-hidden="true" /> Enviar</>
        )}
      </button>
    </form>
  );
}
