import { NextRequest, NextResponse } from 'next/server';

const TIMEOUT_MS          = 10_000;
const BATCH_SIZE          = 16;
const MAX_PAGES           = 600;
const MAX_PARTS           = 80;
const MAX_PER_PART        = 60;
const MAX_PART_GAPS       = 3;   // partes vacías consecutivas toleradas
const MAX_CHAPTER_NUM     = 300; // máximo número de capítulo para el scan profundo
const PAREN_MAX_SCAN      = 500; // máximo nro a probar dentro de un paréntesis
const PAREN_TAIL_MISS     = 50;  // misses consecutivos DESPUÉS del último hit → parar
const PAREN_INIT_MISS     = 32;  // si no hay ningún hit en los primeros N → parte no existe

/* ── Si HEAD falla, usar GET para toda la sesión ── */
let serverPrefersGet = false;

const IMG_EXTS = new Set(['webp', 'jpg', 'jpeg', 'png', 'avif', 'gif']);

const IMGUR_PLACEHOLDER = 'imgur.com/w33tpvZ';

async function tryFetch(url: string, method: 'HEAD' | 'GET'): Promise<[number, string]> {
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
    return [res.status, res.url];
  } catch {
    return [0, ''];
  }
}

function isReal(status: number, finalUrl: string): boolean {
  if (status !== 200 && status !== 206) return false;
  return !finalUrl.includes(IMGUR_PLACEHOLDER);
}

async function exists(url: string): Promise<boolean> {
  if (!serverPrefersGet) {
    const [status, finalUrl] = await tryFetch(url, 'HEAD');
    if (isReal(status, finalUrl)) return true;
    if (status === 404 || status === 410 || status === 0) return false;
    serverPrefersGet = true; // 403, 405, 501… → cambiar a GET
  }
  const [status, finalUrl] = await tryFetch(url, 'GET');
  return isReal(status, finalUrl);
}

async function probeBatch(urls: string[]): Promise<boolean[]> {
  return Promise.all(urls.map(exists));
}

/* ── Patrón simple: 01.webp, 001.webp, 0.webp … ─────────────────────────
   maxGaps: número de páginas consecutivas ausentes toleradas antes de parar.
   0 = comportamiento estricto (parar en el primer fallo).
   2 = tolera huecos pequeños (ej: 04→06 saltando el 05).               ── */
async function probeSimple(
  base: string, ext: string, startIndex: number, pad: number,
  maxGaps: number = 0,
): Promise<string[]> {
  const pages: string[] = [];
  let i = startIndex;
  let consecutiveMisses = 0;
  while (i <= MAX_PAGES) {
    const batch   = Array.from({ length: BATCH_SIZE }, (_, k) =>
      base + String(i + k).padStart(pad, '0') + '.' + ext,
    );
    const results = await probeBatch(batch);
    let stop = false;
    for (let k = 0; k < results.length; k++) {
      if (results[k]) {
        pages.push(String(i + k).padStart(pad, '0') + '.' + ext);
        consecutiveMisses = 0;
      } else {
        if (++consecutiveMisses > maxGaps) { stop = true; break; }
      }
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

/* ── Patrón con prefijo: c-743-1_01.webp / c-743-01_01.webp ─────────────
   El prefijo se deduce de los IDs numéricos en la URL.
   padPart controla si la parte va sin padding (1→"1") o con 2 dígitos (2→"01").
   Tolera huecos igual que probeSubPart.                              ── */
async function probePrefixedSubPart(
  base: string, ext: string, prefix: string, padPart: number = 1,
): Promise<string[]> {
  const pages: string[] = [];
  let gaps = 0;

  for (let part = 1; part <= MAX_PARTS; part++) {
    const pp = String(part).padStart(padPart, '0');
    if (!(await exists(base + `${prefix}${pp}_01.${ext}`))) {
      if (++gaps >= MAX_PART_GAPS) break;
      continue;
    }
    gaps = 0;
    const partPages = await probePagesOfPart(base, ext, `${prefix}${pp}`);
    pages.push(...partPages);
  }
  return pages;
}

/* ── Patrón "N (M).webp": 1 (1).webp, 1 (28).webp … ────
   Los números M pueden NO ser consecutivos (e.g. 1, 28, 29…).
   Algoritmo: barrido adaptativo que rastrea el último hit y
   para solo cuando hay PAREN_TAIL_MISS misses seguidos al final.
   Almacena filenames URL-encoded: "1%20(28).webp".      ── */
async function probeParenPart(base: string, ext: string): Promise<string[]> {
  const pages: string[] = [];
  let partGaps = 0;

  for (let part = 1; part <= MAX_PARTS; part++) {
    const partPages: string[] = [];
    let lastHit = -1;
    let i       = 1;

    while (i <= PAREN_MAX_SCAN) {
      const batchSize = Math.min(BATCH_SIZE, PAREN_MAX_SCAN - i + 1);
      const batch     = Array.from({ length: batchSize }, (_, k) =>
        base + `${part}%20(${i + k}).${ext}`,
      );
      const results = await probeBatch(batch);

      for (let k = 0; k < results.length; k++) {
        if (results[k]) {
          partPages.push(`${part}%20(${i + k}).${ext}`);
          lastHit = i + k;
        }
      }

      i += batchSize;

      // Sin ningún hit aún y ya escaneamos demasiado → esta parte no existe
      if (lastHit < 0 && i > PAREN_INIT_MISS) break;
      // Con hits: parar si llevamos PAREN_TAIL_MISS posiciones vacías desde el último
      if (lastHit >= 0 && i > lastHit + PAREN_TAIL_MISS) break;
    }

    if (partPages.length === 0) {
      if (++partGaps >= MAX_PART_GAPS) break;
      continue;
    }
    partGaps = 0;
    pages.push(...partPages);
  }

  return pages;
}

/* ── Scan profundo: busca en lote qué número de parte existe ─────────────
   Necesario cuando el número de capítulo incrustado en el nombre
   del archivo es mayor que MAX_PART_GAPS (ej: c-743-54_01.webp).
   Sondea en lotes hasta MAX_CHAPTER_NUM y retorna páginas del
   primer número de parte encontrado.                               ── */
async function probePrefixedSubPartDeep(
  base: string, ext: string, prefix: string, padPart: number,
): Promise<string[]> {
  for (let i = 0; i < MAX_CHAPTER_NUM; i += BATCH_SIZE) {
    const count    = Math.min(BATCH_SIZE, MAX_CHAPTER_NUM - i);
    const partNums = Array.from({ length: count }, (_, k) => i + k + 1);
    const batch    = partNums.map((part) =>
      base + `${prefix}${String(part).padStart(padPart, '0')}_01.${ext}`,
    );
    const results = await probeBatch(batch);
    for (let k = 0; k < results.length; k++) {
      if (results[k]) {
        const pp = String(partNums[k]).padStart(padPart, '0');
        return probePagesOfPart(base, ext, `${prefix}${pp}`);
      }
    }
  }
  return [];
}

/* ── Patrón "  (N).webp": %20%20(3).webp, %20%20(4).webp …
   Dos espacios seguidos de un número entre paréntesis.
   El número inicial puede no ser 1 (e.g. empieza en 3).
   Usa el mismo algoritmo adaptativo que probeParenPart.  ── */
async function probeDoubleSpaceParen(base: string, ext: string): Promise<string[]> {
  const pages: string[] = [];
  let lastHit = -1;
  let i = 1;
  while (i <= PAREN_MAX_SCAN) {
    const batchSize = Math.min(BATCH_SIZE, PAREN_MAX_SCAN - i + 1);
    const batch     = Array.from({ length: batchSize }, (_, k) =>
      base + `%20%20(${i + k}).${ext}`,
    );
    const results = await probeBatch(batch);
    for (let k = 0; k < results.length; k++) {
      if (results[k]) {
        pages.push(`%20%20(${i + k}).${ext}`);
        lastHit = i + k;
      }
    }
    i += batchSize;
    if (lastHit < 0 && i > PAREN_INIT_MISS) break;
    if (lastHit >= 0 && i > lastHit + PAREN_TAIL_MISS) break;
  }
  return pages;
}

/* ── Patrón subpart-padded con primera página "-1": 01_01-1.webp, 01_02.webp …
   La primera página de la primera parte lleva sufijo "-1".
   Resto de páginas siguen el patrón normal PP_NN.webp.              ── */
async function probeSubPartDash(base: string, ext: string): Promise<string[]> {
  const pages: string[] = [];
  let gaps = 0;

  for (let part = 1; part <= MAX_PARTS; part++) {
    const pp = String(part).padStart(2, '0');
    // La primera página puede ser PP_01-1 o PP_01 (toleramos ambos)
    const hasDash   = await exists(base + `${pp}_01-1.${ext}`);
    const hasNormal = !hasDash && await exists(base + `${pp}_01.${ext}`);

    if (!hasDash && !hasNormal) {
      if (++gaps >= MAX_PART_GAPS) break;
      continue;
    }
    gaps = 0;

    // Primera página
    pages.push(hasDash ? `${pp}_01-1.${ext}` : `${pp}_01.${ext}`);

    // Páginas 02, 03 … (siempre en formato normal)
    let page = 2;
    while (page <= MAX_PER_PART) {
      const batchSize = Math.min(BATCH_SIZE, MAX_PER_PART - page + 1);
      const batch     = Array.from({ length: batchSize }, (_, k) => {
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

/* ── Patrón "prefix+N-(N+1).webp": c-231-1-2.webp, c-231-2-3.webp … ───
   Cada filename: {prefix}{N}-{N+1}.webp, N incrementa de 1 en 1.    ── */
async function probePrefixedPair(base: string, ext: string, prefix: string): Promise<string[]> {
  const pages: string[] = [];
  let n = 1;
  while (n <= MAX_PAGES) {
    const batch   = Array.from({ length: BATCH_SIZE }, (_, k) =>
      base + `${prefix}${n + k}-${n + k + 1}.${ext}`,
    );
    const results = await probeBatch(batch);
    let stop = false;
    for (let k = 0; k < results.length; k++) {
      if (!results[k]) { stop = true; break; }
      pages.push(`${prefix}${n + k}-${n + k + 1}.${ext}`);
    }
    if (stop) break;
    n += BATCH_SIZE;
  }
  return pages;
}

/* ── Patrón "{part}CL_{page}.webp": 1CL_01.webp, 2CL_01.webp … ────────
   Igual que probeSubPart pero con separador "CL_" en vez de "_".      ── */
async function probeCLSubPart(base: string, ext: string): Promise<string[]> {
  const pages: string[] = [];
  let gaps = 0;
  for (let part = 1; part <= MAX_PARTS; part++) {
    if (!(await exists(base + `${part}CL_01.${ext}`))) {
      if (++gaps >= MAX_PART_GAPS) break;
      continue;
    }
    gaps = 0;
    // probePagesOfPart usa partPrefix + "_" + pg, así que partPrefix = "1CL"
    const partPages = await probePagesOfPart(base, ext, `${part}CL`);
    pages.push(...partPages);
  }
  return pages;
}

/* ── Patrón "{chap}_{part}_{page}.webp": 3_1_01.webp / 3_01_01.webp … ──
   padPart=1 → "3_1_01", padPart=2 → "3_01_01".
   Se necesita chapterHint para evitar un scan ciego.                  ── */
async function probeChapterSubPart(
  base: string, ext: string, chap: number, padPart: number = 1,
): Promise<string[]> {
  const pages: string[] = [];
  let gaps = 0;
  for (let part = 1; part <= MAX_PARTS; part++) {
    const pp = String(part).padStart(padPart, '0');
    if (!(await exists(base + `${chap}_${pp}_01.${ext}`))) {
      if (++gaps >= MAX_PART_GAPS) break;
      continue;
    }
    gaps = 0;
    const partPages = await probePagesOfPart(base, ext, `${chap}_${pp}`);
    pages.push(...partPages);
  }
  return pages;
}

/* ── Patrón "NN copia.webp": 01 copia.webp, 02 copia.webp … ────────────
   Número padded a 2 dígitos + espacio (URL-encoded %20) + "copia" + ext.
   Tolera hasta 2 páginas consecutivas ausentes (huecos).               ── */
async function probeCopiaPages(base: string, ext: string): Promise<string[]> {
  const pages: string[] = [];
  let i = 1;
  let consecutiveMisses = 0;
  while (i <= MAX_PAGES) {
    const batch   = Array.from({ length: BATCH_SIZE }, (_, k) =>
      base + `${String(i + k).padStart(2, '0')}%20copia.${ext}`,
    );
    const results = await probeBatch(batch);
    let stop = false;
    for (let k = 0; k < results.length; k++) {
      if (results[k]) {
        pages.push(`${String(i + k).padStart(2, '0')}%20copia.${ext}`);
        consecutiveMisses = 0;
      } else {
        if (++consecutiveMisses > 2) { stop = true; break; }
      }
    }
    if (stop) break;
    i += BATCH_SIZE;
  }
  return pages;
}

/* ── Scan profundo para chapter-subpart sin chapterHint ─────────────────
   Prueba en lotes qué número de capítulo tiene N_1_01 o N_01_01.webp.  ── */
async function probeChapterSubPartDeep(base: string, ext: string): Promise<string[]> {
  for (let i = 0; i < MAX_CHAPTER_NUM; i += BATCH_SIZE) {
    const count    = Math.min(BATCH_SIZE, MAX_CHAPTER_NUM - i);
    const chapNums = Array.from({ length: count }, (_, k) => i + k + 1);
    // Chequear ambas variantes en paralelo por lote
    const [resUnpad, resPad] = await Promise.all([
      probeBatch(chapNums.map((ch) => base + `${ch}_1_01.${ext}`)),
      probeBatch(chapNums.map((ch) => base + `${ch}_01_01.${ext}`)),
    ]);
    for (let k = 0; k < chapNums.length; k++) {
      if (resUnpad[k]) return probeChapterSubPart(base, ext, chapNums[k], 1);
      if (resPad[k])   return probeChapterSubPart(base, ext, chapNums[k], 2);
    }
  }
  return [];
}

/* ── Obtiene imágenes vía listado de directorio HTML ────────────────────
   Si el servidor sirve un índice HTML (Apache/Nginx/storage CDN),
   extrae y ordena numéricamente los nombres de archivo de imagen.
   Soporta patrones con hash impredecible como "1 - a2404c67.webp".   ── */
async function probeDirectoryListing(base: string): Promise<string[]> {
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res   = await fetch(base, {
      method: 'GET',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GrandielProbe/1.0)' },
    });
    clearTimeout(timer);

    if (res.status !== 200) return [];
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('text/html')) return [];

    const html   = await res.text();
    const hrefRe = /href="([^"?#]+)"/gi;
    const files: string[] = [];
    let m: RegExpExecArray | null;

    while ((m = hrefRe.exec(html)) !== null) {
      let href = m[1];
      // Ignorar enlaces de directorio padre, rutas absolutas y subdirectorios
      if (href === '../' || href.startsWith('/') || href.startsWith('http')) continue;
      if (href.startsWith('./')) href = href.slice(2);
      if (href.includes('/')) continue;

      // Decodificar para verificar extensión
      let decoded: string;
      try { decoded = decodeURIComponent(href); } catch { decoded = href; }
      const dot = decoded.lastIndexOf('.');
      if (dot < 0) continue;
      if (!IMG_EXTS.has(decoded.slice(dot + 1).toLowerCase())) continue;

      // Re-codificar limpiamente (cubre "1 - a2404c67.webp" → "1%20-%20a2404c67.webp")
      files.push(encodeURIComponent(decoded));
    }

    if (files.length === 0) return [];

    // Ordenar numéricamente por el entero inicial del nombre de archivo
    files.sort((a, b) => {
      const na = parseInt(decodeURIComponent(a), 10);
      const nb = parseInt(decodeURIComponent(b), 10);
      if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
      return decodeURIComponent(a).localeCompare(decodeURIComponent(b));
    });

    return files;
  } catch {
    return [];
  }
}

/* ── Extrae imágenes de una página del visor de capítulos ───────────────
   Cuando el CDN usa hashes impredecibles (ej: "1 - bb006670.webp"),
   se puede proporcionar la URL de la página del lector del manga.
   Esta función hace GET a esa página y extrae todas las URLs de imagen
   que empiecen por `base`, devolviendo solo los nombres de archivo.   ── */
async function probeViewerPage(viewerUrl: string, base: string): Promise<string[]> {
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res   = await fetch(viewerUrl, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timer);

    if (res.status !== 200) return [];
    const html = await res.text();

    // Normalizar base: forzar https y trailing slash; también preparar variante http
    const baseHttps = base.replace(/^http:\/\//, 'https://').replace(/\/?$/, '/');
    const baseHttp  = baseHttps.replace(/^https:\/\//, 'http://');

    const found = new Set<string>();

    for (const b of [baseHttps, baseHttp]) {
      const escaped = b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Buscar la base seguida de cualquier carácter de nombre de archivo
      const re = new RegExp(escaped + '([^"\'\\s>\\\\,)\\]\\r\\n]+)', 'gi');
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) {
        let raw = m[1];
        // Quitar puntuación final que no sea parte del nombre
        raw = raw.replace(/[.,;)}\]'"\\]+$/, '');
        let decoded: string;
        try { decoded = decodeURIComponent(raw); } catch { decoded = raw; }
        const dot = decoded.lastIndexOf('.');
        if (dot < 0) continue;
        if (!IMG_EXTS.has(decoded.slice(dot + 1).toLowerCase())) continue;
        found.add(encodeURIComponent(decoded));
      }
    }

    if (found.size === 0) return [];

    const files = [...found];
    files.sort((a, b) => {
      const na = parseInt(decodeURIComponent(a), 10);
      const nb = parseInt(decodeURIComponent(b), 10);
      if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
      return decodeURIComponent(a).localeCompare(decodeURIComponent(b));
    });

    return files;
  } catch {
    return [];
  }
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

  const { baseUrl, ext = 'webp', chapterHint, slugHint, viewerUrl } = await req.json();
  if (!baseUrl) {
    return NextResponse.json({ error: 'baseUrl requerido.' }, { status: 400 });
  }

  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  serverPrefersGet = false; // reset por sesión

  /* ── 0. Si se proporcionó URL del visor, extraer imágenes de la página ── */
  if (viewerUrl) {
    const pages = await probeViewerPage(String(viewerUrl), base);
    if (pages.length > 0) {
      return NextResponse.json({ pages, pattern: 'viewer-page', count: pages.length });
    }
  }

  /* ── 1. Sondear patrones estándar + prefijados en paralelo ── */
  const prefixes = extractPrefixes(base); // ["c-743-", "c-58812-", "743-", "58812-"]

  const standardChecks = [
    `01_01.${ext}`,      // subpart-padded
    `01_01-1.${ext}`,    // subpart-dash (primera página con sufijo -1)
    `1_01.${ext}`,       // subpart-nopad
    `1%20(1).${ext}`,    // paren-part
    `%20%20(1).${ext}`,  // double-space-paren starting at 1
    `%20%20(3).${ext}`,  // double-space-paren starting at 3 (common case)
    `1CL_01.${ext}`,     // cl-subpart
    `01%20copia.${ext}`, // copia-pages: 01 copia.webp
    `001.${ext}`,        // simple-3digit
    `01.${ext}`,         // simple-2digit
    `0.${ext}`,          // zero-indexed
    `1.${ext}`,          // simple-1digit / zero-indexed validator
  ];

  // Chequeos de prefijos: para cada prefijo se prueban dos variantes de padding
  // padPart=1 → "c-743-1_01.webp"   padPart=2 → "c-743-01_01.webp"
  type PrefixVariant = { prefix: string; padPart: number };
  const prefixVariants: PrefixVariant[] = prefixes.flatMap((p) => [
    { prefix: p, padPart: 1 },
    { prefix: p, padPart: 2 },
  ]);
  const prefixChecks = prefixVariants.map(({ prefix, padPart }) =>
    `${prefix}${'1'.padStart(padPart, '0')}_01.${ext}`,
  );

  // Chequeos de pares por prefijo: c-231-1-2.webp
  const pairPrefixChecks = prefixes.map((p) => `${p}1-2.${ext}`);

  const allChecks = [...standardChecks, ...prefixChecks, ...pairPrefixChecks];

  // Ejecutar listado de directorio y checks estándar en paralelo
  const [directoryFiles, allResults] = await Promise.all([
    probeDirectoryListing(base),
    Promise.all(allChecks.map((f) => exists(base + f))),
  ]);

  // Listado de directorio tiene prioridad: cubre patrones con hash impredecible
  // (ej: "1 - a2404c67.webp", "2 - 4b129cdb.webp" …)
  if (directoryFiles.length > 0) {
    return NextResponse.json({ pages: directoryFiles, pattern: 'directory-listing', count: directoryFiles.length });
  }

  const [
    hasSubPad, hasSubDash, hasSubNoPad, hasParen, hasDsP1, hasDsP3, hasCLSubPart,
    hasCopiaPage,
    hasSimple3, hasSimple2, hasZero, hasZero1,
    ...rest
  ] = allResults;
  const prefixResults     = rest.slice(0, prefixVariants.length);
  const pairPrefixResults = rest.slice(prefixVariants.length);
  const hasDoubleSpaceParen = hasDsP1 || hasDsP3;

  /* ── 2. Evaluar en orden de especificidad ── */

  // Subpart con padding: 01_01.webp
  if (hasSubPad) {
    const pages = await probeSubPart(base, ext, 2);
    return NextResponse.json({ pages, pattern: 'subpart-padded', count: pages.length });
  }

  // Subpart con primera página "-1": 01_01-1.webp, 01_02.webp …
  if (hasSubDash) {
    const pages = await probeSubPartDash(base, ext);
    return NextResponse.json({ pages, pattern: 'subpart-dash', count: pages.length });
  }

  // Subpart sin padding: 1_01.webp
  if (hasSubNoPad) {
    const pages = await probeSubPart(base, ext, 1);
    return NextResponse.json({ pages, pattern: 'subpart-nopad', count: pages.length });
  }

  // CL-subpart: 1CL_01.webp, 2CL_01.webp …
  if (hasCLSubPart) {
    const pages = await probeCLSubPart(base, ext);
    return NextResponse.json({ pages, pattern: 'cl-subpart', count: pages.length });
  }

  // Patrón "N (M).webp": 1 (1).webp → almacenado como 1%20(1).webp
  if (hasParen) {
    const pages = await probeParenPart(base, ext);
    return NextResponse.json({ pages, pattern: 'paren-part', count: pages.length });
  }

  // Slug textual: c-463-ingeniero_01.webp / c-463-ingeniero.webp
  // Se activa cuando el usuario proporciona el nombre base de las páginas (sin extensión).
  // Cubre el caso donde el prefijo contiene una palabra en lugar de un número.
  if (slugHint) {
    const prefix = String(slugHint).replace(/\.[a-z0-9]+$/i, '').trim();
    if (prefix) {
      // Multi-página con sufijo _NN: c-463-ingeniero_01.webp, c-463-ingeniero_02.webp …
      if (await exists(base + `${prefix}_01.${ext}`)) {
        const pages = await probePagesOfPart(base, ext, prefix);
        if (pages.length > 0) {
          return NextResponse.json({ pages, pattern: `slug(${prefix})`, count: pages.length });
        }
      }
      // Página única (sin sufijo numérico): c-463-ingeniero.webp
      if (await exists(base + `${prefix}.${ext}`)) {
        return NextResponse.json({ pages: [`${prefix}.${ext}`], pattern: 'slug-single', count: 1 });
      }
    }
  }

  // Patrón "  (N).webp": %20%20(3).webp (dos espacios antes del paréntesis)
  if (hasDoubleSpaceParen) {
    const pages = await probeDoubleSpaceParen(base, ext);
    return NextResponse.json({ pages, pattern: 'double-space-paren', count: pages.length });
  }

  // Prefijo dinámico con chapterHint: c-743-54_01.webp / 3_1_01.webp / 3_01_01.webp
  if (chapterHint != null && !isNaN(Number(chapterHint))) {
    const chNum = Math.floor(Number(chapterHint));

    // Chapter-subpart: detectar variante unpadded (3_1_01) y padded (3_01_01) en paralelo
    const [hasChUnpad, hasChPad] = await Promise.all([
      exists(base + `${chNum}_1_01.${ext}`),
      exists(base + `${chNum}_01_01.${ext}`),
    ]);
    if (hasChUnpad || hasChPad) {
      const padPart = hasChPad && !hasChUnpad ? 2 : 1;
      // Recoger portadas simples (1.webp, 2.webp…) que preceden al contenido del capítulo
      const coverPages   = hasZero1 ? await probeSimple(base, ext, 1, 1) : [];
      const contentPages = await probeChapterSubPart(base, ext, chNum, padPart);
      const pages = [...coverPages, ...contentPages];
      if (pages.length > 0) {
        return NextResponse.json({ pages, pattern: `chapter-subpart(${chNum},pad=${padPart})`, count: pages.length });
      }
    }

    // Prefixed-subpart con chapterHint: c-743-54_01.webp
    for (const { prefix, padPart } of prefixVariants) {
      const pp = String(chNum).padStart(padPart, '0');
      if (await exists(base + `${prefix}${pp}_01.${ext}`)) {
        const pages = await probePagesOfPart(base, ext, `${prefix}${pp}`);
        if (pages.length > 0) {
          return NextResponse.json({ pages, pattern: `prefixed(${prefix})`, count: pages.length });
        }
      }
    }
  }

  // Prefijo dinámico quick check (part=1): c-743-1_01.webp, c-743-01_01.webp, etc.
  for (let i = 0; i < prefixVariants.length; i++) {
    if (prefixResults[i]) {
      const { prefix, padPart } = prefixVariants[i];
      const pages = await probePrefixedSubPart(base, ext, prefix, padPart);
      if (pages.length > 0) {
        return NextResponse.json({ pages, pattern: `prefixed(${prefix})`, count: pages.length });
      }
    }
  }

  // Patrón par prefijado: c-231-1-2.webp, c-231-2-3.webp …
  for (let i = 0; i < prefixes.length; i++) {
    if (pairPrefixResults[i]) {
      const pages = await probePrefixedPair(base, ext, prefixes[i]);
      if (pages.length > 0) {
        return NextResponse.json({ pages, pattern: `prefixed-pair(${prefixes[i]})`, count: pages.length });
      }
    }
  }

  // Scan profundo: busca en lote cualquier número de parte (capítulos 4+)
  // Resuelve el caso c-743-54_01.webp cuando no se proporcionó chapterHint.
  for (const { prefix, padPart } of prefixVariants) {
    const pages = await probePrefixedSubPartDeep(base, ext, prefix, padPart);
    if (pages.length > 0) {
      return NextResponse.json({ pages, pattern: `prefixed(${prefix})`, count: pages.length });
    }
  }

  // Scan profundo chapter-subpart sin chapterHint: N_1_01.webp / N_01_01.webp
  {
    const contentPages = await probeChapterSubPartDeep(base, ext);
    if (contentPages.length > 0) {
      const coverPages = hasZero1 ? await probeSimple(base, ext, 1, 1) : [];
      const pages = [...coverPages, ...contentPages];
      return NextResponse.json({ pages, pattern: 'chapter-subpart', count: pages.length });
    }
  }

  // Patrón "NN copia.webp": 01 copia.webp, 02 copia.webp …
  if (hasCopiaPage) {
    const pages = await probeCopiaPages(base, ext);
    return NextResponse.json({ pages, pattern: 'copia-pages', count: pages.length });
  }

  // Simple 3 dígitos: 001.webp
  if (hasSimple3) {
    const pages = await probeSimple(base, ext, 1, 3, 2);
    return NextResponse.json({ pages, pattern: 'simple-3digit', count: pages.length });
  }

  // Simple 2 dígitos: 01.webp
  if (hasSimple2) {
    const pages = await probeSimple(base, ext, 1, 2, 2);
    return NextResponse.json({ pages, pattern: 'simple-2digit', count: pages.length });
  }

  // Zero-indexed: 0.webp (requiere que 1.webp también exista para evitar falsos positivos)
  if (hasZero && hasZero1) {
    const pages = await probeSimple(base, ext, 0, 1, 2);
    return NextResponse.json({ pages, pattern: 'zero-indexed', count: pages.length });
  }

  // Simple 1 dígito desde 1: 1.webp, 2.webp, 3.webp …
  if (hasZero1) {
    const pages = await probeSimple(base, ext, 1, 1, 2);
    return NextResponse.json({ pages, pattern: 'simple-1digit', count: pages.length });
  }

  return NextResponse.json(
    { error: 'No se detectó ningún patrón conocido. Verifica que la URL base sea correcta y termine en /.', pages: [] },
    { status: 404 },
  );
}
