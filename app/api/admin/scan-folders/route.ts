import { NextRequest, NextResponse } from 'next/server';

const TIMEOUT_MS = 6_000;
const BATCH_SIZE = 16;
const MAX_RANGE  = 100_000;

// Patrones estándar de primera página (nombre base sin extensión), en orden de probabilidad
const STD_PATTERNS = ['01_01', '1_01', '01', '001'] as const;

let prefersGet = false;

async function quickExists(url: string): Promise<boolean> {
  const method = prefersGet ? 'GET' : 'HEAD';
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res   = await fetch(url, {
      method,
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GrandielProbe/1.0)',
        ...(method === 'GET' ? { Range: 'bytes=0-0' } : {}),
      },
    });
    clearTimeout(timer);
    if (res.status === 200 || res.status === 206) return true;
    if (!prefersGet && (res.status === 403 || res.status === 405)) {
      prefersGet = true;
      const r2 = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GrandielProbe/1.0)', Range: 'bytes=0-0' },
      });
      return r2.status === 200 || r2.status === 206;
    }
    return false;
  } catch {
    return false;
  }
}

/* Escanea una lista de folder IDs probando UN patrón de página.
   Devuelve el Set de folders donde se encontró el patrón.       */
async function scanPass(
  base: string,
  folders: number[],
  pattern: string,
  ext: string,
): Promise<Set<number>> {
  const found = new Set<number>();
  for (let i = 0; i < folders.length; i += BATCH_SIZE) {
    const chunk   = folders.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      chunk.map((fid) => quickExists(`${base}/${fid}/${pattern}.${ext}`)),
    );
    chunk.forEach((fid, k) => { if (results[k]) found.add(fid); });
  }
  return found;
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Solo disponible en desarrollo local.' }, { status: 403 });
  }

  const body = await req.json();
  const { comicBase, folderStart, folderEnd, ext = 'webp', slugHint } = body;

  if (!comicBase || folderStart == null || folderEnd == null) {
    return NextResponse.json(
      { error: 'comicBase, folderStart y folderEnd son requeridos.' },
      { status: 400 },
    );
  }

  const start = Number(folderStart);
  const end   = Number(folderEnd);

  if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
    return NextResponse.json({ error: 'Rango inválido.' }, { status: 400 });
  }
  if (end - start + 1 > MAX_RANGE) {
    return NextResponse.json(
      { error: `Rango demasiado grande. Máximo ${MAX_RANGE.toLocaleString()} folders por escaneo.` },
      { status: 400 },
    );
  }

  const base    = comicBase.replace(/\/$/, '');
  prefersGet    = false;

  // Construye la lista de patrones a probar, en orden de prioridad:
  // Si hay slugHint (ej: "c-463-ingeniero"), se prueban primero las variantes del slug,
  // luego los patrones estándar como fallback.
  const slugBase = slugHint ? String(slugHint).replace(/\.[a-z0-9]+$/i, '').trim() : '';
  const patterns: string[] = [
    ...(slugBase ? [`${slugBase}_01`, slugBase] : []),
    ...STD_PATTERNS,
  ];

  // Pases secuenciales: cada pase usa BATCH_SIZE=16 folders en paralelo
  // y solo procesa folders que aún no se encontraron en pases anteriores.
  const allFolders = Array.from({ length: end - start + 1 }, (_, k) => start + k);
  const foundSet   = new Set<number>();

  for (const pattern of patterns) {
    const remaining = allFolders.filter((f) => !foundSet.has(f));
    if (!remaining.length) break;
    const hits = await scanPass(base, remaining, pattern, ext);
    hits.forEach((f) => foundSet.add(f));
  }

  const found = [...foundSet].sort((a, b) => a - b);
  return NextResponse.json({
    found,
    count: found.length,
    total: allFolders.length,
  });
}
