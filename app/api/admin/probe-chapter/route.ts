import { NextRequest, NextResponse } from 'next/server';
import { probeChapter } from '@/lib/scraper/probe';

/**
 * Sondea la carpeta de un capítulo y devuelve los nombres de sus páginas.
 * Toda la lógica vive en lib/scraper/probe.ts para que el sincronizador
 * automático (lib/scraper/sync.ts) pueda reutilizarla sin pasar por HTTP.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { baseUrl, ext = 'webp', chapterHint, slugHint, viewerUrl } = body;

  if (!baseUrl) {
    return NextResponse.json({ error: 'baseUrl requerido.' }, { status: 400 });
  }
  if (!/^[a-z0-9]{1,5}$/i.test(ext)) {
    return NextResponse.json({ error: 'Extensión inválida.' }, { status: 400 });
  }

  const result = await probeChapter({ baseUrl, ext, chapterHint, slugHint, viewerUrl });

  // Sin páginas detectadas → 404, igual que antes de la extracción.
  if (!result.pages?.length) {
    return NextResponse.json(result, { status: 404 });
  }
  return NextResponse.json(result);
}
