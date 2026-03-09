export default function Loading() {
  return (
    <div className="curva">
      {/* Header skeleton */}
      <div className="manga-header">
        <div className="manga-header__cover">
          <div
            className="skeleton-cover"
            style={{ width: 220, height: 310, borderRadius: '8px' }}
            aria-hidden="true"
          />
        </div>
        <div className="manga-header__info" style={{ flex: 1 }}>
          <div className="skeleton-line" style={{ width: '70%', height: '28px', marginBottom: '0.75rem' }} />
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div className="skeleton-line" style={{ width: '70px', height: '22px', borderRadius: '12px' }} />
            <div className="skeleton-line" style={{ width: '90px', height: '22px', borderRadius: '12px' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {[80, 65, 90, 55].map((w, i) => (
              <div key={i} className="skeleton-line" style={{ width: w, height: '20px', borderRadius: '6px' }} />
            ))}
          </div>
          <div className="skeleton-line" style={{ width: '50%', height: '14px', marginBottom: '1.2rem' }} />
          <div className="skeleton-line" style={{ width: '100%', height: '12px', marginBottom: '0.4rem' }} />
          <div className="skeleton-line" style={{ width: '90%', height: '12px', marginBottom: '0.4rem' }} />
          <div className="skeleton-line" style={{ width: '75%', height: '12px', marginBottom: '1.5rem' }} />
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="skeleton-line" style={{ width: '160px', height: '40px', borderRadius: '8px' }} />
            <div className="skeleton-line" style={{ width: '100px', height: '40px', borderRadius: '8px' }} />
          </div>
        </div>
      </div>

      {/* Lower skeleton */}
      <div className="manga-lower">
        <div className="manga-lower__main">
          <div className="chapters-header">
            <div className="skeleton-line" style={{ width: '110px', height: '20px' }} />
            <div className="skeleton-line" style={{ width: '80px', height: '16px' }} />
          </div>
          <div className="chapters-scroll">
            <section className="capitulos" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="cap">
                  <div className="skeleton-line" style={{ width: `${60 + (i % 3) * 10}%`, height: '14px' }} />
                </div>
              ))}
            </section>
          </div>
        </div>
        <aside className="manga-lower__side">
          <div className="skeleton-line" style={{ width: '120px', height: '20px', marginBottom: '1rem' }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
              <div className="skeleton-cover" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-line" style={{ width: '50%', height: '12px', marginBottom: '0.4rem' }} />
                <div className="skeleton-line" style={{ width: '90%', height: '11px' }} />
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
