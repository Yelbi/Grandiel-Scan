import { MangaGridSkeleton } from '@/components/manga/MangaCardSkeleton';

/**
 * Esqueleto con la forma real de la galería. Aquí sí es correcto: es el fallback
 * de Suspense mientras la consulta está en vuelo, no un estado permanente.
 * El "sin datos" de la portada usa un mensaje, no un esqueleto (app/page.tsx).
 */
export default function Loading() {
  return (
    <div className="container">
      <MangaGridSkeleton count={18} />
    </div>
  );
}
