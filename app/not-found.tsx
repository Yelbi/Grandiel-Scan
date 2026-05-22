import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Página no encontrada — Grandiel Scan',
  description: 'El manga o capítulo que buscas no existe o fue eliminado.',
};

export default function NotFound() {
  return (
    <div
      className="curva"
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
