'use client';

import { ALLOWED_GENRES } from '@/lib/config';

export function GenrePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (genre: string) =>
    onChange(value.includes(genre) ? value.filter((g) => g !== genre) : [...value, genre]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ALLOWED_GENRES.map((g) => {
          const active = value.includes(g);
          return (
            <button
              key={g}
              type="button"
              onClick={() => toggle(g)}
              style={{
                padding: '4px 10px', borderRadius: 20, fontSize: '.78rem', cursor: 'pointer',
                border: active ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.15)',
                background: active ? 'rgba(255,50,50,0.18)' : 'rgba(255,255,255,0.04)',
                color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontWeight: active ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {g}
            </button>
          );
        })}
      </div>
      {value.length > 0 && (
        <span className="form-hint">
          {value.length} género{value.length !== 1 ? 's' : ''} seleccionado{value.length !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
