export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        flexDirection: 'column',
        gap: '1rem',
        color: 'var(--color-text-secondary)',
      }}
    >
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--color-primary, #ff0000)' }} aria-hidden="true" />
      <span>Cargando...</span>
    </div>
  );
}
