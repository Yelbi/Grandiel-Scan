export default function Loading() {
  return (
    <div className="curva" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--color-primary, #ff0000)', marginBottom: '1rem', display: 'block' }} aria-hidden="true" />
      <p style={{ color: 'var(--color-text-secondary)' }}>Cargando manga...</p>
    </div>
  );
}
