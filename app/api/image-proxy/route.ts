import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = new Set(['cdn.arenascan.com']);
const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml']);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url param', { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  if (parsed.protocol !== 'https:') {
    return new NextResponse('Only HTTPS allowed', { status: 403 });
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return new NextResponse('Host not allowed', { status: 403 });
  }

  // Re-construir la URL desde el objeto parseado para evitar ataques de
  // normalización unicode o redirecciones en la URL cruda original.
  const safeUrl = parsed.href;

  try {
    const upstream = await fetch(safeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });

    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status });
    }

    // Verificar que el upstream devuelve una imagen
    const contentType = (upstream.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return new NextResponse('Content type not allowed', { status: 415 });
    }

    // Rechazar respuestas que excedan el límite de tamaño antes de leer el body
    const contentLength = upstream.headers.get('content-length');
    if (contentLength && Number(contentLength) > MAX_SIZE_BYTES) {
      return new NextResponse('Content too large', { status: 413 });
    }

    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength > MAX_SIZE_BYTES) {
      return new NextResponse('Content too large', { status: 413 });
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
        'Content-Length': String(buffer.byteLength),
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Proxy error', { status: 502 });
  }
}
