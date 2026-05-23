export default function MangaCardSkeleton() {
  return (
    <div className="manga-card product-item skeleton-card" aria-hidden="true">
      <div className="manga-card-inner skeleton-cover" />
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-meta" />
    </div>
  );
}

export function MangaGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="manga-grid" aria-busy="true" aria-label="Cargando títulos...">
      {Array.from({ length: count }).map((_, i) => (
        <MangaCardSkeleton key={i} />
      ))}
    </div>
  );
}
