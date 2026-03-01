import { NextRequest, NextResponse } from 'next/server';

const TIMEOUT_MS          = 10_000;
const BATCH_SIZE          = 16;
const MAX_PAGES           = 600;
const MAX_PARTS           = 80;
const MAX_PER_PART        = 60;
const MAX_PART_GAPS       = 3;   // partes vacías consecutivas toleradas

/* ── Si HEAD falla, usar GET para toda la sesión ── */
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
    return 0;
  }
}

async function exists(url: string): Promise<boolean> {
  if (!serverPrefersGet) {
    const status = await tryFetch(url, 'HEAD');
    if (status === 200 || status === 206) return true;
    if (status === 404 || status === 410 || status === 0) return false;
    serverPrefersGet = true; // 403, 405, 501… → cambiar a GET
  }
  const status = await tryFetch(url, 'GET');
  return status === 200 || status === 206;
}

async function probeBatch(urls: string[]): Promise<boolean[]> {
  return Promise.all(urls.map(exists));
}

/* ── Patrón simple: 01.webp, 001.webp, 0.webp … ─────── */
async function probeSimple(
  base: string, ext: string, startIndex: number, pad: number,
): Promise<string[]> {
  const pages: string[] = [];
  let i = startIndex;
  while (i <= MAX_PAGES) {
    const batch   = Array.from({ length: BATCH_SIZE }, (_, k) =>
      base + String(i + k).padStart(pad, '0') + '.' + ext,
    );
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

/* ── Sondea páginas dentro de una parte (en lotes) ───── */
async function probePagesOfPart(
  base: string, ext: string, partPrefix: string,
): Promise<string[]> {
  const pages: string[] = [];
  let page = 1;
  while (page <= MAX_PER_PART) {
    const batchSize = Math.min(BATCH_SIZE, MAX_PER_PART - page + 1);
    const batch     = Array.from({ length: batchSize }, (_, k) => {
      const pg = String(page + k).padStart(2, '0');
      return base + `${partPrefix}_${pg}.${ext}`;
    });
    const results = await probeBatch(batch);
    let stop = false;
    for (let k = 0; k < results.length; k++) {
      if (!results[k]) { stop = true; break; }
      pages.push(`${partPrefix}_${String(page + k).padStart(2, '0')}.${ext}`);
    }
    if (stop) break;
    page += batchSize;
  }
  return pages;
}

/* ── Patrón subparte: 01_01.webp / 1_01.webp ────────────
   padPart = 2 → "01_01", padPart = 1 → "1_01"
   Tolera hasta MAX_PART_GAPS partes consecutivas vacías
   (por si hay huecos en la numeración).                 ── */
async function probeSubPart(
  base: string, ext: string, padPart: number,
): Promise<string[]> {
  const pages: string[] = [];
  let gaps = 0;

  for (let part = 1; part <= MAX_PARTS; part++) {
    const pp = String(part).padStart(padPart, '0');
    if (!(await exists(base + `${pp}_01.${ext}`))) {
      if (++gaps >= MAX_PART_GAPS) break;
      continue;
    }
    gaps = 0;
    const partPages = await probePagesOfPart(base, ext, pp);
    pages.push(...partPages);
  }
  return pages;
}

/* ── Patrón con prefijo: c-743-1_01.webp ────────────────
   El prefijo se deduce de los IDs numéricos en la URL.
   Tolera huecos igual que probeSubPart.                ── */
async function probePrefixedSubPart(
  base: string, ext: string, prefix: string,
): Promise<string[]> {
  const pages: string[] = [];
  let gaps = 0;

  for (let part = 1; part <= MAX_PARTS; part++) {
    if (!(await exists(base + `${prefix}${part}_01.${ext}`))) {
      if (++gaps >= MAX_PART_GAPS) break;
      continue;
    }
    gaps = 0;
    const partPages = await probePagesOfPart(base, ext, `${prefix}${part}`);
    pages.push(...partPages);
  }
  return pages;
}

/* ── Patrón "N (M).webp": 1 (1).webp, 2 (1).webp … ─────
   Almacena el filename URL-encoded ("1%20(1).webp") para que
   baseUrl + page forme una URL válida.
   Tolera huecos en la numeración de partes.             ── */
async function probeParenPart(base: string, ext: string): Promise<string[]> {
  const pages: string[] = [];
  let gaps = 0;

  for (let part = 1; part <= MAX_PARTS; part++) {
    if (!(await exists(base + `${part}%20(1).${ext}`))) {
      if (++gaps >= MAX_PART_GAPS) break;
      continue;
    }
    gaps = 0;

    for (let page = 1; page <= MAX_PER_PART; page++) {
      if (!(await exists(base + `${part}%20(${page}).${ext}`))) break;
      pages.push(`${part}%20(${page}).${ext}`);
    }
  }
  return pages;
}

/* ── Extrae prefijos candidatos de la URL base ───────────
   Ej: ".../comics/743/58812/" → ["c-743-", "c-58812-", "743-", "58812-"]
── */
function extractPrefixes(baseUrl: string): string[] {
  try {
    const segments   = new URL(baseUrl).pathname.split('/').filter(Boolean);
    const numericIds = segments.filter((s) => /^\d+$/.test(s));
    return numericIds.flatMap((id) => [`c-${id}-`, `${id}-`]);
  } catch {
    return [];
  }
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
  serverPrefersGet = false; // reset por sesión

  /* ── 1. Sondear patrones estándar + prefijados en paralelo ── */
  const prefixes = extractPrefixes(base); // ["c-743-", "c-58812-", "743-", "58812-"]

  const standardChecks = [
    `01_01.${ext}`,      // subpart-padded
    `1_01.${ext}`,       // subpart-nopad
    `1%20(1).${ext}`,    // paren-part  ← nuevo
    `001.${ext}`,        // simple-3digit
    `01.${ext}`,         // simple-2digit
    `0.${ext}`,          // zero-indexed
    `1.${ext}`,          // zero-indexed validator
  ];

  // Chequeos de prefijos: cada uno prueba "prefix + 1_01.ext"
  const prefixChecks = prefixes.map((p) => `${p}1_01.${ext}`);

  const allChecks  = [...standardChecks, ...prefixChecks];
  const allResults = await Promise.all(allChecks.map((f) => exists(base + f)));

  const [
    hasSubPad, hasSubNoPad, hasParen, hasSimple3, hasSimple2, hasZero, hasZero1,
    ...prefixResults
  ] = allResults;

  /* ── 2. Evaluar en orden de especificidad ── */

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

  // Patrón "N (M).webp": 1 (1).webp → almacenado como 1%20(1).webp
  if (hasParen) {
    const pages = await probeParenPart(base, ext);
    return NextResponse.json({ pages, pattern: 'paren-part', count: pages.length });
  }

  // Prefijo dinámico: c-743-1_01.webp, 743-1_01.webp, etc.
  for (let i = 0; i < prefixes.length; i++) {
    if (prefixResults[i]) {
      const pages = await probePrefixedSubPart(base, ext, prefixes[i]);
      if (pages.length > 0) {
        return NextResponse.json({ pages, pattern: `prefixed(${prefixes[i]})`, count: pages.length });
      }
    }
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

  // Zero-indexed: 0.webp (requiere que 1.webp también exista para evitar falsos positivos)
  if (hasZero && hasZero1) {
    const pages = await probeSimple(base, ext, 0, 1);
    return NextResponse.json({ pages, pattern: 'zero-indexed', count: pages.length });
  }

  return NextResponse.json(
    { error: 'No se detectó ningún patrón conocido. Verifica que la URL base sea correcta y termine en /.', pages: [] },
    { status: 404 },
  );
}
