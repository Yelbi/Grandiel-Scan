import { MangaGridSkeleton } from '@/components/manga/MangaCardSkeleton';

export default function Loading() {
  return (
    <div className="curva">
      <h1>Galería</h1>
      <div className="filter-bar">
        <div className="skeleton-line" style={{ width: '100px', height: '36px', borderRadius: '6px' }} />
      </div>
      <div className="skeleton-line" style={{ width: '160px', height: '16px', margin: '0.5rem 0 1rem' }} />
      <MangaGridSkeleton count={12} />
    </div>
  );
}
