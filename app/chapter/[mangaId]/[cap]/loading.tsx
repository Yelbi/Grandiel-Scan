export default function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', flexDirection: 'column', gap: '1rem' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: 'var(--color-primary, #ff0000)' }} aria-hidden="true" />
      <p style={{ color: 'var(--color-text-secondary)' }}>Cargando capítulo...</p>
    </div>
  );
}
