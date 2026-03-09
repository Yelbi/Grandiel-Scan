function SkeletonCard() {
  return (
    <div className="manga-card product-item skeleton-card" aria-hidden="true">
      <div className="manga-card-inner skeleton-cover" />
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-meta" />
    </div>
  );
}

export default function Loading() {
  return (
    <div className="curva">
      <div className="novedades-header">
        <div className="skeleton-line" style={{ width: '200px', height: '28px', margin: '0 auto 0.5rem' }} />
        <div className="skeleton-line" style={{ width: '320px', height: '14px', margin: '0 auto' }} />
      </div>
      <div className="novedades-tabs">
        <div className="skeleton-line" style={{ width: '150px', height: '40px', borderRadius: '8px' }} />
        <div className="skeleton-line" style={{ width: '100px', height: '40px', borderRadius: '8px', marginLeft: '0.5rem' }} />
      </div>
      <div className="nuevos-section">
        <div className="skeleton-line" style={{ width: '140px', height: '18px', marginBottom: '1rem' }} />
        <div className="mami">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    </div>
  );
}
