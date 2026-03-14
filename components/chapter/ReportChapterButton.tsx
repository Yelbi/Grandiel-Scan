'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const REASONS: { value: string; label: string }[] = [
  { value: 'incomplete',     label: 'Páginas incompletas' },
  { value: 'not_loading',    label: 'No carga / imágenes rotas' },
  { value: 'wrong_chapter',  label: 'Capítulo equivocado' },
  { value: 'low_quality',    label: 'Mala calidad' },
  { value: 'other',          label: 'Otro' },
];

interface Props {
  mangaId: string;
  chapter: number;
  mangaTitle: string;
}

export default function ReportChapterButton({ mangaId, chapter, mangaTitle }: Props) {
  const [open, setOpen]           = useState(false);
  const [reason, setReason]       = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');
  const dialogRef                 = useRef<HTMLDivElement>(null);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
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
      setTimeout(() => setOpen(false), 2000);
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botón en la topbar */}
      <button
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

      {/* Modal — portal para escapar del stacking context del reader-topbar */}
      {open && createPortal(
        <div
          className="report-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-title"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
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
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
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
                {error && <p className="report-modal__error">{error}</p>}

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
                    Detalles adicionales <span style={{ opacity: 0.5 }}>(opcional)</span>
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
                    onClick={() => setOpen(false)}
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
