'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const REASONS: { value: string; label: string }[] = [
  { value: 'incomplete',     label: 'Páginas incompletas' },
  { value: 'not_loading',    label: 'No carga / imágenes rotas' },
  { value: 'wrong_chapter',  label: 'Capítulo equivocado' },
  { value: 'low_quality',    label: 'Mala calidad' },
  { value: 'other',          label: 'Otro' },
];

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface Props {
  mangaId: string;
  chapter: number;
  mangaTitle: string;
}

export default function ReportChapterButton({ mangaId, chapter, mangaTitle }: Props) {
  const [open, setOpen]               = useState(false);
  const [reason, setReason]           = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);
  const [error, setError]             = useState('');
  const dialogRef  = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleClose = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  // Escape → close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, handleClose]);

  // Block body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Focus first element when modal opens
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    requestAnimationFrame(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    });
  }, [open]);

  // Focus trap: keep Tab/Shift+Tab inside the modal
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [open]);

  const handleOpen = () => {
    setReason('');
    setDescription('');
    setError('');
    setSuccess(false);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!reason) { setError('Selecciona un motivo.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chapter',
          mangaId,
          chapter,
          reason,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? 'Error al enviar el reporte.'); return; }
      setSuccess(true);
      setTimeout(() => handleClose(), 2000);
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        className="reader-mode-btn reader-topbar__report"
        onClick={handleOpen}
        title="Reportar problema con este capítulo"
        aria-label="Reportar problema"
      >
        <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
      </button>

      {open && createPortal(
        <div
          className="report-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-title"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="report-modal" ref={dialogRef}>
            <div className="report-modal__header">
              <div>
                <h2 className="report-modal__title" id="report-title">Reportar problema</h2>
                <p className="report-modal__sub">
                  Cap. {chapter} · {mangaTitle}
                </p>
              </div>
              <button
                className="report-modal__close"
                onClick={handleClose}
                aria-label="Cerrar modal"
              >
                <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {success ? (
              <div className="report-modal__success">
                <svg viewBox="0 0 24 24" width="2.5rem" height="2.5rem" fill="none" stroke="var(--color-success, #22c55e)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <p>¡Reporte enviado! Gracias por ayudarnos a mejorar.</p>
              </div>
            ) : (
              <form className="report-modal__form" onSubmit={handleSubmit}>
                {error && (
                  <p className="report-modal__error" role="alert" aria-live="assertive">
                    {error}
                  </p>
                )}

                <fieldset className="report-modal__fieldset">
                  <legend className="report-modal__legend">¿Cuál es el problema?</legend>
                  <div className="report-reasons">
                    {REASONS.map(({ value, label }) => (
                      <label
                        key={value}
                        className={`report-reason${reason === value ? ' selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="reason"
                          value={value}
                          checked={reason === value}
                          onChange={() => { setReason(value); setError(''); }}
                          className="report-reason__input"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="report-modal__detail">
                  <label htmlFor="report-desc" className="report-modal__label">
                    Detalles adicionales <span className="report-modal__optional">(opcional)</span>
                  </label>
                  <textarea
                    id="report-desc"
                    className="report-modal__textarea"
                    placeholder="Describe el problema con más detalle..."
                    rows={3}
                    maxLength={500}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <span className="report-modal__char-count">{description.length}/500</span>
                </div>

                <div className="report-modal__actions">
                  <button
                    type="button"
                    className="report-modal__btn report-modal__btn--cancel"
                    onClick={handleClose}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="report-modal__btn report-modal__btn--submit"
                    disabled={loading || !reason}
                  >
                    {loading ? (
                      <>
                        <svg className="report-spin" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" />
                        </svg>
                        Enviando...
                      </>
                    ) : (
                      'Enviar reporte'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
