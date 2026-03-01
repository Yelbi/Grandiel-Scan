import { NextRequest, NextResponse } from 'next/server';

const TIMEOUT_MS   = 8000;
const BATCH_SIZE   = 12;   // peticiones paralelas por tanda
const MAX_PAGES    = 600;  // límite de seguridad
const MAX_PARTS    = 60;   // para patrón XX_YY
const MAX_PER_PART = 40;

/* ── HTTP check con timeout ────────────────────────── */
async function exists(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/* ── Prueba un rango de índices en paralelo ─────────── */
async function probeBatch(
  urls: string[],
): Promise<boolean[]> {
  return Promise.all(urls.map((u) => exists(u)));
}

/* ── Patrón simple: 01.webp, 02.webp … ─────────────── */
async function probeSimple(
  base: string,
  ext: string,
  startIndex: number,
  pad: number,
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

/* ── Patrón subparte: 01_01.webp, 01_02.webp, 02_01 … */
async function probeSubPart(base: string, ext: string): Promise<string[]> {
  const pages: string[] = [];

  for (let part = 1; part <= MAX_PARTS; part++) {
    const pp = String(part).padStart(2, '0');
    // ¿existe la primera página de este parte?
    if (!(await exists(base + `${pp}_01.${ext}`))) break;

    for (let page = 1; page <= MAX_PER_PART; page++) {
      const pg = String(page).padStart(2, '0');
      const filename = `${pp}_${pg}.${ext}`;
      if (!(await exists(base + filename))) break;
      pages.push(filename);
    }
  }

  return pages;
}

/* ── Handler ────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Solo disponible en desarrollo local.' }, { status: 403 });
  }

  const { baseUrl, ext = 'webp' } = await req.json();
  if (!baseUrl) {
    return NextResponse.json({ error: 'baseUrl requerido.' }, { status: 400 });
  }

  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';

  /* ── Detectar patrón probando las primeras URLs ─── */

  // Patrón simple 2 dígitos: 01.webp
  if (await exists(base + `01.${ext}`)) {
    const pages = await probeSimple(base, ext, 1, 2);
    return NextResponse.json({ pages, pattern: 'simple-2digit', count: pages.length });
  }

  // Patrón 3 dígitos: 001.webp
  if (await exists(base + `001.${ext}`)) {
    const pages = await probeSimple(base, ext, 1, 3);
    return NextResponse.json({ pages, pattern: 'simple-3digit', count: pages.length });
  }

  // Patrón zero-indexed: 0.webp
  if (await exists(base + `0.${ext}`)) {
    const pages = await probeSimple(base, ext, 0, 1);
    return NextResponse.json({ pages, pattern: 'zero-indexed', count: pages.length });
  }

  // Patrón subparte: 01_01.webp
  if (await exists(base + `01_01.${ext}`)) {
    const pages = await probeSubPart(base, ext);
    return NextResponse.json({ pages, pattern: 'subpart', count: pages.length });
  }

  return NextResponse.json(
    { error: 'No se detectó ningún patrón conocido. Verifica la URL base.', pages: [] },
    { status: 404 },
  );
}
