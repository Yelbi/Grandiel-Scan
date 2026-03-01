import { NextRequest, NextResponse } from 'next/server';

const TIMEOUT_MS   = 10_000;
const BATCH_SIZE   = 16;
const MAX_PAGES    = 600;
const MAX_PARTS    = 60;
const MAX_PER_PART = 50;

/* ── Estado por petición: si HEAD no funciona, usamos GET ── */
let serverPrefersGet = false;

async function tryFetch(url: string, method: 'HEAD' | 'GET'): Promise<number> {
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
    return res.status;
  } catch {
    return 0; // timeout / red caída
  }
}

async function exists(url: string): Promise<boolean> {
  if (!serverPrefersGet) {
    const status = await tryFetch(url, 'HEAD');
    if (status === 200 || status === 206) return true;
    if (status === 404 || status === 410 || status === 0) return false;
    // Cualquier otro código (403, 405, 501…) → intentar con GET
    serverPrefersGet = true;
  }
  const status = await tryFetch(url, 'GET');
  return status === 200 || status === 206;
}

/* ── Prueba un lote de URLs en paralelo ──────────────── */
async function probeBatch(urls: string[]): Promise<boolean[]> {
  return Promise.all(urls.map(exists));
}

/* ── Patrón simple: 01.webp, 002.webp, 0.webp … ─────── */
async function probeSimple(
  base: string, ext: string, startIndex: number, pad: number,
): Promise<string[]> {
  const pages: string[] = [];
  let i = startIndex;

  while (i <= MAX_PAGES) {
    const batch = Array.from({ length: BATCH_SIZE }, (_, k) => {
      const n = i + k;
      return base + String(n).padStart(pad, '0') + '.' + ext;
    });
    const results = await probeBatch(batch);
    let stop = false;
    for (let k = 0; k < results.length; k++) {
      if (!results[k]) { stop = true; break; }
      pages.push(String(i + k).padStart(pad, '0') + '.' + ext);
    }
    if (stop) break;
    i += BATCH_SIZE;
  }
  return pages;
}

/* ── Patrón subparte con batching en páginas ─────────── */
async function probeSubPart(
  base: string, ext: string, padPart: number,
): Promise<string[]> {
  const pages: string[] = [];

  for (let part = 1; part <= MAX_PARTS; part++) {
    const pp = String(part).padStart(padPart, '0');
    if (!(await exists(base + `${pp}_01.${ext}`))) break;

    // Revisar páginas del parte en lotes
    let page = 1;
    while (page <= MAX_PER_PART) {
      const batchSize = Math.min(BATCH_SIZE, MAX_PER_PART - page + 1);
      const batch = Array.from({ length: batchSize }, (_, k) => {
        const pg = String(page + k).padStart(2, '0');
        return base + `${pp}_${pg}.${ext}`;
      });
      const results = await probeBatch(batch);
      let stop = false;
      for (let k = 0; k < results.length; k++) {
        if (!results[k]) { stop = true; break; }
        pages.push(`${pp}_${String(page + k).padStart(2, '0')}.${ext}`);
      }
      if (stop) break;
      page += batchSize;
    }
  }
  return pages;
}

/* ── Handler ─────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Solo disponible en desarrollo local.' }, { status: 403 });
  }

  const { baseUrl, ext = 'webp' } = await req.json();
  if (!baseUrl) {
    return NextResponse.json({ error: 'baseUrl requerido.' }, { status: 400 });
  }

  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';

  // Reset por si la petición anterior forzó GET en otro servidor
  serverPrefersGet = false;

  /* ── Sondear candidatos en paralelo ─────────────────
     Orden de prioridad: subpart (más específico) antes que
     simple, y zero-indexed al final (propenso a falsos positivos).
  ── */
  const [
    hasSubPad,    // 01_01.webp  ← más específico
    hasSubNoPad,  // 1_01.webp
    hasSimple3,   // 001.webp
    hasSimple2,   // 01.webp
    hasZero,      // 0.webp      ← más ambiguo, al final
    hasZero1,     // 1.webp  (para validar zero-indexed real)
  ] = await Promise.all([
    exists(base + `01_01.${ext}`),
    exists(base + `1_01.${ext}`),
    exists(base + `001.${ext}`),
    exists(base + `01.${ext}`),
    exists(base + `0.${ext}`),
    exists(base + `1.${ext}`),
  ]);

  // Subpart con padding: 01_01.webp
  if (hasSubPad) {
    const pages = await probeSubPart(base, ext, 2);
    return NextResponse.json({ pages, pattern: 'subpart-padded', count: pages.length });
  }

  // Subpart sin padding: 1_01.webp
  if (hasSubNoPad) {
    const pages = await probeSubPart(base, ext, 1);
    return NextResponse.json({ pages, pattern: 'subpart-nopad', count: pages.length });
  }

  // Simple 3 dígitos: 001.webp
  if (hasSimple3) {
    const pages = await probeSimple(base, ext, 1, 3);
    return NextResponse.json({ pages, pattern: 'simple-3digit', count: pages.length });
  }

  // Simple 2 dígitos: 01.webp
  if (hasSimple2) {
    const pages = await probeSimple(base, ext, 1, 2);
    return NextResponse.json({ pages, pattern: 'simple-2digit', count: pages.length });
  }

  // Zero-indexed: 0.webp — solo si además existe 1.webp (evita falsos positivos)
  if (hasZero && hasZero1) {
    const pages = await probeSimple(base, ext, 0, 1);
    return NextResponse.json({ pages, pattern: 'zero-indexed', count: pages.length });
  }

  return NextResponse.json(
    { error: 'No se detectó ningún patrón conocido. Verifica que la URL base sea correcta y termine en /.', pages: [] },
    { status: 404 },
  );
}
