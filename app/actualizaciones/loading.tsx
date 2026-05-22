import { MangaGridSkeleton } from '@/components/manga/MangaCardSkeleton';

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
        <MangaGridSkeleton count={6} />
      </div>
    </div>
  );
}
