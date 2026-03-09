export default function Loading() {
  return (
    <div className="reader-wrapper" aria-hidden="true">
      {/* Topbar skeleton */}
      <div className="reader-topbar" style={{ gap: '8px' }}>
        <div className="skeleton-line" style={{ width: '32px', height: '32px', borderRadius: '6px', flexShrink: 0 }} />
        <div className="skeleton-line" style={{ flex: 1, maxWidth: '180px', height: '14px', margin: '0 auto' }} />
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {[34, 34, 90, 34, 34].map((w, i) => (
            <div key={i} className="skeleton-line" style={{ width: w, height: '34px', borderRadius: '4px' }} />
          ))}
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)' }} />
      {/* Page skeleton */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 16px' }}>
        <div
          className="skeleton-cover"
          style={{ width: '75%', maxWidth: '600px', aspectRatio: '2/3', borderRadius: '4px' }}
        />
      </div>
    </div>
  );
}
