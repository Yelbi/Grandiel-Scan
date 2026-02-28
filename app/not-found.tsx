import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="page-container"
      style={{ textAlign: 'center', padding: '4rem 2rem' }}
    >
      <h1 style={{ fontSize: '6rem', color: 'var(--color-primary)', margin: 0 }}>
        404
      </h1>
      <h2>Página no encontrada</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
        El manga o capítulo que buscas no existe o fue eliminado.
      </p>
      <Link href="/" className="btn">
        <i className="fas fa-home" /> Ir al inicio
      </Link>
    </div>
  );
}
