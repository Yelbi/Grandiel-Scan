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
      <h1>Galería</h1>
      {/* Filter bar placeholder */}
      <div className="filter-bar">
        <div className="skeleton-line" style={{ width: '100px', height: '36px', borderRadius: '6px' }} />
      </div>
      <div className="skeleton-line" style={{ width: '160px', height: '16px', margin: '0.5rem 0 1rem' }} />
      {/* Grid de skeletons */}
      <div className="mami">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
