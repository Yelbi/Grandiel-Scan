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

/* Estado por request — evita race conditions entre peticiones concurrentes */
interface Session {
  prefersGet: boolean;
}

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

async function exists(url: string, session: Session): Promise<boolean> {
  if (!session.prefersGet) {
    const [status, finalUrl] = await tryFetch(url, 'HEAD');
    if (isReal(status, finalUrl)) return true;
    if (status === 404 || status === 410 || status === 0) return false;
    session.prefersGet = true; // 403, 405, 501… → cambiar a GET
  }
  const [status, finalUrl] = await tryFetch(url, 'GET');
  return isReal(status, finalUrl);
}

async function probeBatch(urls: string[], session: Session): Promise<boolean[]> {
  return Promise.all(urls.map((u) => exists(u, session)));
}

/* ── Patrón simple: 01.webp, 001.webp, 0.webp … ─────────────────────────
   maxGaps: número de páginas consecutivas ausentes toleradas antes de parar.
   0 = comportamiento estricto (parar en el primer fallo).
   2 = tolera huecos pequeños (ej: 04→06 saltando el 05).               ── */
async function probeSimple(
  base: string, ext: string, startIndex: number, pad: number,
  maxGaps: number = 0, session: Session,
): Promise<string[]> {
  const pages: string[] = [];
  let i = startIndex;
  let consecutiveMisses = 0;
  while (i <= MAX_PAGES) {
    const count   = Math.min(BATCH_SIZE, MAX_PAGES - i + 1);
    const batch   = Array.from({ length: count }, (_, k) =>
      base + String(i + k).padStart(pad, '0') + '.' + ext,
    );
    const results = await probeBatch(batch, session);
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
    i += count;
  }
  return pages;
}

/* ── Sondea páginas dentro de una parte (en lotes) ───── */
async function probePagesOfPart(
  base: string, ext: string, partPrefix: string, session: Session, pagePad = 2,
): Promise<string[]> {
  const pages: string[] = [];
  let page = 1;
  while (page <= MAX_PER_PART) {
    const batchSize = Math.min(BATCH_SIZE, MAX_PER_PART - page + 1);
    const batch     = Array.from({ length: batchSize }, (_, k) => {
      const pg = String(page + k).padStart(pagePad, '0');
      return base + `${partPrefix}_${pg}.${ext}`;
    });
    const results = await probeBatch(batch, session);
    let stop = false;
    for (let k = 0; k < results.length; k++) {
      if (!results[k]) { stop = true; break; }
      pages.push(`${partPrefix}_${String(page + k).padStart(pagePad, '0')}.${ext}`);
    }
    if (stop) break;
    page += batchSize;
  }
  return pages;
}

/* ── Patrón stockage.manga-scantrad.io: 0001_001.jpg ────────────────────
   4 dígitos para el capítulo + 3 dígitos para la página.
   Ej: capítulo 2 → 0002_001.jpg, 0002_002.jpg …                        ── */
async function probeChapPage4x3(
  base: string, ext: string, chapNum: number, session: Session,
): Promise<string[]> {
  const prefix = String(chapNum).padStart(4, '0');
  return probePagesOfPart(base, ext, prefix, session, 3);
}

/* ── Patrón subparte: 01_01.webp / 1_01.webp ────────────
   padPart = 2 → "01_01", padPart = 1 → "1_01"
   Tolera hasta MAX_PART_GAPS partes consecutivas vacías
   (por si hay huecos en la numeración).                 ── */
async function probeSubPart(
  base: string, ext: string, padPart: number, session: Session,
): Promise<string[]> {
  const pages: string[] = [];
  let gaps = 0;

  for (let partStart = 1; partStart <= MAX_PARTS; partStart += BATCH_SIZE) {
    const count    = Math.min(BATCH_SIZE, MAX_PARTS - partStart + 1);
    const partNums = Array.from({ length: count }, (_, k) => partStart + k);
    const results  = await probeBatch(
      partNums.map((p) => base + `${String(p).padStart(padPart, '0')}_01.${ext}`),
      session,
    );
    let stop = false;
    for (let k = 0; k < results.length; k++) {
      if (!results[k]) {
        if (++gaps >= MAX_PART_GAPS) { stop = true; break; }
        continue;
      }
      gaps = 0;
      const pp        = String(partNums[k]).padStart(padPart, '0');
      const partPages = await probePagesOfPart(base, ext, pp, session);
      pages.push(...partPages);
    }
    if (stop) break;
  }
  return pages;
}

/* ── Patrón con prefijo: c-743-1_01.webp / c-743-01_01.webp ─────────────
   El prefijo se deduce de los IDs numéricos en la URL.
   padPart controla si la parte va sin padding (1→"1") o con 2 dígitos (2→"01").
   Tolera huecos igual que probeSubPart.                              ── */
async function probePrefixedSubPart(
  base: string, ext: string, prefix: string, padPart: number = 1, session: Session,
): Promise<string[]> {
  const pages: string[] = [];
  let gaps = 0;

  for (let partStart = 1; partStart <= MAX_PARTS; partStart += BATCH_SIZE) {
    const count    = Math.min(BATCH_SIZE, MAX_PARTS - partStart + 1);
    const partNums = Array.from({ length: count }, (_, k) => partStart + k);
    const results  = await probeBatch(
      partNums.map((p) => base + `${prefix}${String(p).padStart(padPart, '0')}_01.${ext}`),
      session,
    );
    let stop = false;
    for (let k = 0; k < results.length; k++) {
      if (!results[k]) {
        if (++gaps >= MAX_PART_GAPS) { stop = true; break; }
        continue;
      }
      gaps = 0;
      const pp        = String(partNums[k]).padStart(padPart, '0');
      const partPages = await probePagesOfPart(base, ext, `${prefix}${pp}`, session);
      pages.push(...partPages);
    }
    if (stop) break;
  }
  return pages;
}

/* ── Patrón "N (M).webp": 1 (1).webp, 1 (28).webp … ────
   Los números M pueden NO ser consecutivos (e.g. 1, 28, 29…).
   Algoritmo: barrido adaptativo que rastrea el último hit y
   para solo cuando hay PAREN_TAIL_MISS misses seguidos al final.
   Almacena filenames URL-encoded: "1%20(28).webp".      ── */
async function probeParenPart(base: string, ext: string, session: Session, startPart = 1): Promise<string[]> {
  const pages: string[] = [];
  let partGaps = 0;

  for (let part = startPart; part <= MAX_PARTS; part++) {
    const partPages: string[] = [];
    let lastHit = -1;
    let i       = 1;

    while (i <= PAREN_MAX_SCAN) {
      const batchSize = Math.min(BATCH_SIZE, PAREN_MAX_SCAN - i + 1);
      const batch     = Array.from({ length: batchSize }, (_, k) =>
        base + `${part}%20(${i + k}).${ext}`,
      );
      const results = await probeBatch(batch, session);

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
  base: string, ext: string, prefix: string, padPart: number, session: Session,
): Promise<string[]> {
  for (let i = 0; i < MAX_CHAPTER_NUM; i += BATCH_SIZE) {
    const count    = Math.min(BATCH_SIZE, MAX_CHAPTER_NUM - i);
    const partNums = Array.from({ length: count }, (_, k) => i + k + 1);
    const batch    = partNums.map((part) =>
      base + `${prefix}${String(part).padStart(padPart, '0')}_01.${ext}`,
    );
    const results = await probeBatch(batch, session);
    for (let k = 0; k < results.length; k++) {
      if (results[k]) {
        const pp = String(partNums[k]).padStart(padPart, '0');
        return probePagesOfPart(base, ext, `${prefix}${pp}`, session);
      }
    }
  }
  return [];
}

/* ── Patrón "prefix+part (N).webp": c-65-1%20(1).webp, c-65-3%20(2).webp …
   Igual que probeParenPart pero con prefijo antepuesto al número de parte.
   Ej: prefix="c-65-", startPart=3 → c-65-3%20(1).webp, c-65-4%20(1).webp …
   startPart permite comenzar desde la parte correcta cuando la parte 1 no existe. ── */
async function probePrefixedParenPart(
  base: string, ext: string, prefix: string, session: Session, startPart = 1,
): Promise<string[]> {
  const pages: string[] = [];
  let partGaps = 0;

  for (let part = startPart; part <= MAX_PARTS + startPart - 1; part++) {
    const partPages: string[] = [];
    let lastHit = -1;
    let i = 1;

    while (i <= PAREN_MAX_SCAN) {
      const batchSize = Math.min(BATCH_SIZE, PAREN_MAX_SCAN - i + 1);
      const batch = Array.from({ length: batchSize }, (_, k) =>
        base + `${prefix}${part}%20(${i + k}).${ext}`,
      );
      const results = await probeBatch(batch, session);

      for (let k = 0; k < results.length; k++) {
        if (results[k]) {
          partPages.push(`${prefix}${part}%20(${i + k}).${ext}`);
          lastHit = i + k;
        }
      }

      i += batchSize;
      if (lastHit < 0 && i > PAREN_INIT_MISS) break;
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

/* ── Scan profundo para prefixed-paren cuando la parte 1 no existe ──────
   Sondea en lotes qué número de parte tiene ${prefix}N%20(1).webp.
   Ej: si c-65-1 falla pero c-65-3 existe, retorna pages desde parte 3. ── */
async function probePrefixedParenPartDeep(
  base: string, ext: string, prefix: string, session: Session,
): Promise<string[]> {
  for (let i = 1; i < MAX_CHAPTER_NUM; i += BATCH_SIZE) {
    const count    = Math.min(BATCH_SIZE, MAX_CHAPTER_NUM - i);
    const partNums = Array.from({ length: count }, (_, k) => i + k);
    const batch    = partNums.map((part) => base + `${prefix}${part}%20(1).${ext}`);
    const results  = await probeBatch(batch, session);
    for (let k = 0; k < results.length; k++) {
      if (results[k]) {
        return probePrefixedParenPart(base, ext, prefix, session, partNums[k]);
      }
    }
  }
  return [];
}

/* ── Patrón "  (N).webp": %20%20(3).webp, %20%20(4).webp …
   Dos espacios seguidos de un número entre paréntesis.
   El número inicial puede no ser 1 (e.g. empieza en 3).
   Usa el mismo algoritmo adaptativo que probeParenPart.  ── */
async function probeDoubleSpaceParen(base: string, ext: string, session: Session): Promise<string[]> {
  const pages: string[] = [];
  let lastHit = -1;
  let i = 1;
  while (i <= PAREN_MAX_SCAN) {
    const batchSize = Math.min(BATCH_SIZE, PAREN_MAX_SCAN - i + 1);
    const batch     = Array.from({ length: batchSize }, (_, k) =>
      base + `%20%20(${i + k}).${ext}`,
    );
    const results = await probeBatch(batch, session);
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
async function probeSubPartDash(base: string, ext: string, session: Session): Promise<string[]> {
  const pages: string[] = [];
  let gaps = 0;

  for (let partStart = 1; partStart <= MAX_PARTS; partStart += BATCH_SIZE) {
    const count    = Math.min(BATCH_SIZE, MAX_PARTS - partStart + 1);
    const partNums = Array.from({ length: count }, (_, k) => partStart + k);
    const pps      = partNums.map((p) => String(p).padStart(2, '0'));

    // Verificar primera página dash y normal en paralelo para todo el lote
    const [dashResults, normalResults] = await Promise.all([
      probeBatch(pps.map((pp) => base + `${pp}_01-1.${ext}`), session),
      probeBatch(pps.map((pp) => base + `${pp}_01.${ext}`), session),
    ]);

    let stop = false;
    for (let k = 0; k < partNums.length; k++) {
      const hasDash   = dashResults[k];
      const hasNormal = !hasDash && normalResults[k];

      if (!hasDash && !hasNormal) {
        if (++gaps >= MAX_PART_GAPS) { stop = true; break; }
        continue;
      }
      gaps = 0;

      const pp = pps[k];
      // Primera página
      pages.push(hasDash ? `${pp}_01-1.${ext}` : `${pp}_01.${ext}`);

      // Páginas 02, 03 … (siempre en formato normal)
      let page = 2;
      while (page <= MAX_PER_PART) {
        const batchSize = Math.min(BATCH_SIZE, MAX_PER_PART - page + 1);
        const batch     = Array.from({ length: batchSize }, (_, j) => {
          const pg = String(page + j).padStart(2, '0');
          return base + `${pp}_${pg}.${ext}`;
        });
        const results = await probeBatch(batch, session);
        let innerStop = false;
        for (let j = 0; j < results.length; j++) {
          if (!results[j]) { innerStop = true; break; }
          pages.push(`${pp}_${String(page + j).padStart(2, '0')}.${ext}`);
        }
        if (innerStop) break;
        page += batchSize;
      }
    }
    if (stop) break;
  }
  return pages;
}

/* ── Patrón "prefix+N-(N+1).webp": c-231-1-2.webp, c-231-2-3.webp … ───
   Cada filename: {prefix}{N}-{N+1}.webp, N incrementa de 1 en 1.    ── */
async function probePrefixedPair(base: string, ext: string, prefix: string, session: Session): Promise<string[]> {
  const pages: string[] = [];
  let n = 1;
  while (n <= MAX_PAGES) {
    const batch   = Array.from({ length: BATCH_SIZE }, (_, k) =>
      base + `${prefix}${n + k}-${n + k + 1}.${ext}`,
    );
    const results = await probeBatch(batch, session);
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
async function probeCLSubPart(base: string, ext: string, session: Session): Promise<string[]> {
  const pages: string[] = [];
  let gaps = 0;

  for (let partStart = 1; partStart <= MAX_PARTS; partStart += BATCH_SIZE) {
    const count    = Math.min(BATCH_SIZE, MAX_PARTS - partStart + 1);
    const partNums = Array.from({ length: count }, (_, k) => partStart + k);
    // probePagesOfPart usa partPrefix + "_" + pg, así que partPrefix = "NCL"
    const results  = await probeBatch(
      partNums.map((p) => base + `${p}CL_01.${ext}`),
      session,
    );
    let stop = false;
    for (let k = 0; k < results.length; k++) {
      if (!results[k]) {
        if (++gaps >= MAX_PART_GAPS) { stop = true; break; }
        continue;
      }
      gaps = 0;
      const partPages = await probePagesOfPart(base, ext, `${partNums[k]}CL`, session);
      pages.push(...partPages);
    }
    if (stop) break;
  }
  return pages;
}

/* ── Patrón "{chap}_{part}_{page}.webp": 3_1_01.webp / 3_01_01.webp … ──
   padPart=1 → "3_1_01", padPart=2 → "3_01_01".
   Se necesita chapterHint para evitar un scan ciego.                  ── */
async function probeChapterSubPart(
  base: string, ext: string, chap: number, padPart: number = 1, session: Session,
): Promise<string[]> {
  const pages: string[] = [];
  let gaps = 0;
  for (let part = 1; part <= MAX_PARTS; part++) {
    const pp = String(part).padStart(padPart, '0');
    if (!(await exists(base + `${chap}_${pp}_01.${ext}`, session))) {
      if (++gaps >= MAX_PART_GAPS) break;
      continue;
    }
    gaps = 0;
    const partPages = await probePagesOfPart(base, ext, `${chap}_${pp}`, session);
    pages.push(...partPages);
  }
  return pages;
}

/* ── Patrón "NN copia.webp": 01 copia.webp, 02 copia.webp … ────────────
   Número padded a 2 dígitos + espacio (URL-encoded %20) + "copia" + ext.
   Tolera hasta 2 páginas consecutivas ausentes (huecos).               ── */
async function probeCopiaPages(base: string, ext: string, session: Session): Promise<string[]> {
  const pages: string[] = [];
  let i = 1;
  let consecutiveMisses = 0;
  while (i <= MAX_PAGES) {
    const batch   = Array.from({ length: BATCH_SIZE }, (_, k) =>
      base + `${String(i + k).padStart(2, '0')}%20copia.${ext}`,
    );
    const results = await probeBatch(batch, session);
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

/* ── Encuentra el primer índice de página simple que existe ─────────────
   Recorre [from, to] en lotes y devuelve el primer índice donde existe
   un archivo {padded}.ext. Usado para detectar offsets de inicio no
   estándar (ej: 010.webp, 020.webp …).                                ── */
async function findSimpleStart(
  base: string, ext: string, from: number, to: number, pad: number, session: Session,
): Promise<number | null> {
  for (let i = from; i <= to; i += BATCH_SIZE) {
    const count   = Math.min(BATCH_SIZE, to - i + 1);
    const batch   = Array.from({ length: count }, (_, k) =>
      base + String(i + k).padStart(pad, '0') + '.' + ext,
    );
    const results = await probeBatch(batch, session);
    for (let k = 0; k < results.length; k++) {
      if (results[k]) return i + k;
    }
  }
  return null;
}

/* ── Scan profundo para chapter-subpart sin chapterHint ─────────────────
   Prueba en lotes qué número de capítulo tiene N_1_01 o N_01_01.webp.  ── */
async function probeChapterSubPartDeep(base: string, ext: string, session: Session): Promise<string[]> {
  for (let i = 0; i < MAX_CHAPTER_NUM; i += BATCH_SIZE) {
    const count    = Math.min(BATCH_SIZE, MAX_CHAPTER_NUM - i);
    const chapNums = Array.from({ length: count }, (_, k) => i + k + 1);
    // Chequear ambas variantes en paralelo por lote
    const [resUnpad, resPad] = await Promise.all([
      probeBatch(chapNums.map((ch) => base + `${ch}_1_01.${ext}`), session),
      probeBatch(chapNums.map((ch) => base + `${ch}_01_01.${ext}`), session),
    ]);
    for (let k = 0; k < chapNums.length; k++) {
      if (resUnpad[k]) return probeChapterSubPart(base, ext, chapNums[k], 1, session);
      if (resPad[k])   return probeChapterSubPart(base, ext, chapNums[k], 2, session);
    }
  }
  return [];
}

/* ── Extrae la clave de ordenación de un filename decodificado ───────────
   Para patrones simples (004.webp) usa el número directamente.
   Para subpart ({part}_{page}.ext, ej: 01_03.webp, 1_10.webp) usa el
   número de página (último segmento numérico) para que el orden refleje
   la lectura real cuando hay patrones mezclados (01_03 → 3, 004 → 4,
   1_10 → 10).
   Para hash ({N} - {hash}.ext) usa el número de página inicial.           ── */
function extractSortKey(decoded: string): number {
  // Subpart: uno o más bloques {digits_} seguidos de {digits} → usar el último número
  // Cubre: 01_03.webp, 1_10.webp, 3_01_05.webp, etc.
  // No cubre subpart-dash (01_01-1.webp) intencionalmente — el guion rompe el patrón.
  const subpart = /^(?:\d+_)+(\d+)\.[a-z0-9]+$/i.exec(decoded);
  if (subpart) return parseInt(subpart[1], 10);

  // Hash: {N} - {algo}.ext → usar N
  const hash = /^(\d+)\s*[-–]\s*\S+\.[a-z0-9]+$/i.exec(decoded);
  if (hash) return parseInt(hash[1], 10);

  // Default: número inicial del string
  const n = parseInt(decoded, 10);
  return isNaN(n) ? Infinity : n;
}

/* ── Ordena filenames URL-encoded numéricamente ─────────── */
function sortImageFiles(files: Iterable<string>): string[] {
  const unique = [...new Set(files)];
  unique.sort((a, b) => {
    const da = decodeURIComponent(a);
    const db = decodeURIComponent(b);
    const na = extractSortKey(da);
    const nb = extractSortKey(db);
    if (na !== nb) return na - nb;
    return da.localeCompare(db);
  });
  return unique;
}

/* ── Valida y normaliza un nombre de fichero a filename URL-encoded ──── */
function normalizeFilename(raw: string): string | null {
  const segment = raw.split('/').pop() ?? raw;
  let decoded: string;
  try { decoded = decodeURIComponent(segment.trim()); } catch { decoded = segment.trim(); }
  if (!decoded) return null;
  const dot = decoded.lastIndexOf('.');
  if (dot < 0) return null;
  if (!IMG_EXTS.has(decoded.slice(dot + 1).toLowerCase())) return null;
  return encodeURIComponent(decoded);
}

/* ── Extrae filenames standalone con patrón "N - hash.ext" ───────────────
   Soporta variantes URL-encoded y textos JS escapados:
   • 1%20-%20bb006670.webp
   • 1 - bb006670.webp
   • 0%20-%2016771837972179439_Palo_de_madera_+99_Ep__37_0001.webp
   • https:\/\/...\/1 - bb006670.webp                                       ── */
function extractStandaloneHashFiles(html: string): string[] {
  const sources = [
    html,
    html.replace(/\\\//g, '/').replace(/\\u002f/gi, '/').replace(/\\u0020/gi, ' '),
  ];

  const patterns = [
    /\b(\d{1,4}%20-%20[\w.%+\-()+]+\.(?:webp|jpg|jpeg|png|avif|gif))\b/gi,
    /\b(\d{1,4}(?:%20|\s)?-(?:%20|\s)?[\w.%+\-()+]+\.(?:webp|jpg|jpeg|png|avif|gif))\b/gi,
  ];

  const found = new Set<string>();
  for (const source of sources) {
    for (const re of patterns) {
      let m: RegExpExecArray | null;
      re.lastIndex = 0;
      while ((m = re.exec(source)) !== null) {
        const f = normalizeFilename(m[1]);
        if (f) found.add(f);
      }
    }
  }

  return sortImageFiles(found);
}

/* ── Parsea un JSON de listado de archivos ──────────────────────────────
   Formatos soportados:
   • Array de strings:  ["1 - bb006670.webp", "2 - 6dbb4d70.webp"]
   • Array de objetos:  [{name:"…"}, {filename:"…"}, {key:"…"}, {url:"…"}]
   • Wrapper con clave: {files:[…]}, {data:[…]}, {items:[…]}, {results:[…]} ── */
function parseJsonFileListing(body: unknown): string[] {
  const candidates: string[] = [];
  const extract = (v: unknown): void => {
    if (typeof v === 'string') {
      candidates.push(v);
    } else if (Array.isArray(v)) {
      v.forEach(extract);
    } else if (v && typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      for (const key of ['name', 'filename', 'file', 'key', 'Key', 'path', 'url', 'src']) {
        if (typeof obj[key] === 'string') candidates.push(obj[key] as string);
      }
      for (const key of ['files', 'data', 'items', 'results', 'contents', 'objects']) {
        if (Array.isArray(obj[key])) (obj[key] as unknown[]).forEach(extract);
      }
    }
  };
  extract(body);
  return sortImageFiles(candidates.map(normalizeFilename).filter((f): f is string => f !== null));
}

/* ── Parsea XML compatible con S3/MinIO/GCS/Wasabi ─────────────────────
   Extrae los elementos <Key>…</Key> (S3) o <Name>…</Name>.           ── */
function parseXmlFileListing(xml: string): string[] {
  const re = /<(?:Key|Name|Filename|filename)>([^<]+)<\/(?:Key|Name|Filename|filename)>/g;
  const files: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const f = normalizeFilename(m[1]);
    if (f) files.push(f);
  }
  return sortImageFiles(files);
}

/* ── Obtiene imágenes vía listado de directorio ─────────────────────────
   Soporta tres formatos de respuesta del servidor:
   • HTML  — índice Apache/Nginx autoindex (href="…")
   • JSON  — backends de almacenamiento que retornan array de archivos
   • XML   — API compatible con S3/MinIO/GCS (elementos <Key>)
   Cubre patrones con hash impredecible como "1 - a2404c67.webp".      ── */
async function probeDirectoryListing(base: string): Promise<string[]> {
  // Probar primero con trailing slash, luego sin él (algunos servidores listan en /path no en /path/)
  const roots = base.endsWith('/')
    ? [base, base.slice(0, -1)]
    : [base + '/', base];

  const queryVariants = ['', '?json=1', '?format=json', '?output=json', '?list=1', '?listing=1', '?list-type=2'];
  const urls = new Set<string>();
  for (const root of roots) {
    for (const q of queryVariants) {
      urls.add(`${root}${q}`);
    }
  }

  const results = await Promise.all([...urls].map(fetchDirectoryListing));
  return results.find((r) => r.length > 0) ?? [];
}

async function fetchDirectoryListing(url: string): Promise<string[]> {
  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res   = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      headers: {
        // Usar UA de navegador real — servidores bloquean UAs de bots con 403/404
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, application/xml, text/html, */*',
      },
    });
    clearTimeout(timer);

    if (res.status !== 200) return [];
    const ct = res.headers.get('content-type') ?? '';

    // ── JSON listing ─────────────────────────────────────────────────────
    if (ct.includes('application/json') || ct.includes('text/json')) {
      try { return parseJsonFileListing(await res.json() as unknown); }
      catch { return []; }
    }

    // ── S3 / MinIO / GCS / Wasabi XML listing ────────────────────────────
    if (ct.includes('/xml')) return parseXmlFileListing(await res.text());

    // ── Texto desconocido: intentar parsear como JSON (content-type incorrecto) ──
    if (!ct.includes('text/html')) {
      try { return parseJsonFileListing(JSON.parse(await res.text())); }
      catch { return []; }
    }

    // ── HTML: buscar tanto hrefs relativos como URLs absolutas que empiecen en base ──
    const html   = await res.text();
    const files: string[] = [];
    let m: RegExpExecArray | null;

    // 1. Hrefs relativos (nginx/apache autoindex)
    const hrefRe = /href="([^"?#]+)"/gi;
    while ((m = hrefRe.exec(html)) !== null) {
      let href = m[1];
      if (href === '../' || href.startsWith('/') || href.startsWith('http')) continue;
      if (href.startsWith('./')) href = href.slice(2);
      if (href.includes('/')) continue;
      const f = normalizeFilename(href);
      if (f) files.push(f);
    }

    // 2. URLs absolutas que empiecen en la URL del directorio (CDNs que retornan URLs completas en el HTML)
    if (files.length === 0) {
      const baseHttps = url.replace(/^http:\/\//, 'https://').replace(/\/?$/, '/');
      const baseHttp  = baseHttps.replace(/^https:\/\//, 'http://');
      for (const b of [baseHttps, baseHttp]) {
        const escaped = b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const absRe   = new RegExp(escaped + '([^"\'\\s>\\\\,\\]\\r\\n]+)', 'gi');
        while ((m = absRe.exec(html)) !== null) {
          const f = normalizeFilename(m[1].replace(/[.,;)}\]'"\\]+$/, ''));
          if (f) files.push(f);
        }
        if (files.length > 0) break;
      }
    }

    return sortImageFiles(files);
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
      const re = new RegExp(escaped + '([^"\'\\s>\\\\,\\]\\r\\n]+)', 'gi');
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

    if (found.size > 0) return sortImageFiles(found);

    // Fallback: algunas páginas exponen solo filenames (sin URL completa).
    return extractStandaloneHashFiles(html);
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

function buildViewerCandidates(viewerUrl: string, baseUrl: string): string[] {
  const raw = viewerUrl.trim();
  if (!raw) return [];
  if (/^https?:\/\//i.test(raw)) return [raw];
  if (!raw.startsWith('/')) return [raw];

  const out = new Set<string>();
  const addWithHost = (host: string, protocol = 'https:') => {
    if (!host) return;
    out.add(`${protocol}//${host}${raw}`);
  };

  try {
    const base = new URL(baseUrl);
    addWithHost(base.host, base.protocol);

    const dashboardPrefix = 'dashboard.';
    if (base.hostname.startsWith(dashboardPrefix)) {
      const plainHost = base.hostname.slice(dashboardPrefix.length);
      addWithHost(plainHost, base.protocol);
      addWithHost(plainHost, 'https:');
    }

    const hostParts = base.hostname.split('.');
    if (hostParts.length >= 2) {
      const rootHost = hostParts.slice(-2).join('.');
      addWithHost(rootHost, base.protocol);
      addWithHost(rootHost, 'https:');
    }
  } catch {
    // ignore malformed base URL
  }

  // Hosts comunes de los viewers usados con este storage.
  addWithHost('olympusbiblioteca.com');
  addWithHost('olympusscans.com');
  addWithHost('ikigaimangas.com');

  return [...out];
}

/* ── Auto-construye la URL del visor a partir de la URL del CDN ──────────
   Soporta media.ikigaimangas.cloud:
     CDN:    https://media.ikigaimangas.cloud/series/{seriesId}/{chapterId}/
     Visor:  https://ikigaimangas.com/capitulo/{chapterId}/
   Devuelve null si la URL no coincide con ningún patrón conocido.          ── */
function tryBuildAutoViewerUrl(baseUrl: string): string | null {
  try {
    const url      = new URL(baseUrl);
    const hostname = url.hostname.toLowerCase();

    // media.ikigaimangas.cloud → ikigaimangas.com/capitulo/{chapterId}/
    if (hostname === 'media.ikigaimangas.cloud') {
      const segments = url.pathname.split('/').filter(Boolean);
      // Ruta esperada: /series/{seriesId}/{chapterId}
      if (segments.length >= 3 && segments[0] === 'series') {
        const chapterId = segments[2];
        return `https://ikigaimangas.com/capitulo/${chapterId}/`;
      }
    }

    return null;
  } catch {
    return null;
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
  if (!/^[a-z0-9]{1,5}$/i.test(ext)) {
    return NextResponse.json({ error: 'Extensión inválida.' }, { status: 400 });
  }

  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  // Estado aislado por request — evita interferencias con requests concurrentes
  const session: Session = { prefersGet: false };

  /* ── 0. Si se proporcionó URL del visor, extraer imágenes de la página ── */
  if (viewerUrl) {
    for (const candidate of buildViewerCandidates(String(viewerUrl), base)) {
      const pages = await probeViewerPage(candidate, base);
      if (pages.length > 0) {
        return NextResponse.json({ pages, pattern: 'viewer-page', count: pages.length });
      }
    }
  }

  /* ── 1. Sondear patrones estándar + prefijados en paralelo ── */
  const prefixes = extractPrefixes(base); // ["c-743-", "c-58812-", "743-", "58812-"]

  const standardChecks = [
    `01_01.${ext}`,       // subpart-padded
    `01_01-1.${ext}`,     // subpart-dash (primera página con sufijo -1)
    `1_01.${ext}`,        // subpart-nopad
    `0001_001.${ext}`,    // stockage-style: 4-digit-chap + 3-digit-page (manga-scantrad.io)
    `1%20(1).${ext}`,     // paren-part
    `0%20(1).${ext}`,     // zero-paren-part: 0 (1).webp, 0 (2).webp …
    `%20%20(1).${ext}`,   // double-space-paren starting at 1
    `%20%20(3).${ext}`,   // double-space-paren starting at 3 (common case)
    `1CL_01.${ext}`,      // cl-subpart
    `01%20copia.${ext}`,  // copia-pages: 01 copia.webp
    `001.${ext}`,         // simple-3digit
    `002.${ext}`,         // simple-3digit-from-002 (ikigaimangas: portada nombrada + páginas desde 002)
    `003.${ext}`,         // simple-3digit-from-003 (ikigaimangas: portada 0.webp + páginas desde 003)
    `01.${ext}`,          // simple-2digit
    `02.${ext}`,          // simple-2digit-from-02 (ikigaimangas: portada nombrada + páginas 2-digit desde 02)
    `0.${ext}`,           // zero-indexed
    `1.${ext}`,           // simple-1digit / zero-indexed validator
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

  // Chequeos de paréntesis por prefijo: c-65-1%20(1).webp y c-65-{chap}%20(1).webp
  const prefixParenChecks = prefixes.map((p) => `${p}1%20(1).${ext}`);

  const allChecks = [...standardChecks, ...prefixChecks, ...pairPrefixChecks, ...prefixParenChecks];

  // Para CDNs conocidos (ej: ikigaimangas) construimos la URL del visor automáticamente
  // y la ejecutamos en paralelo con los checks estándar. También omitimos el listado de
  // directorio para ese CDN (no lo soporta), evitando hasta 5-6 s de espera en vano.
  const autoViewerUrl = tryBuildAutoViewerUrl(base);

  const [autoViewerPages, directoryFiles, allResults] = await Promise.all([
    autoViewerUrl ? probeViewerPage(autoViewerUrl, base) : Promise.resolve([] as string[]),
    autoViewerUrl ? Promise.resolve([] as string[]) : probeDirectoryListing(base),
    Promise.all(allChecks.map((f) => exists(base + f, session))),
  ]);

  // Auto-viewer de CDN conocido: cubre portadas con nombre descriptivo + páginas desde 002
  if (autoViewerPages.length > 0) {
    return NextResponse.json({ pages: autoViewerPages, pattern: 'auto-viewer', count: autoViewerPages.length });
  }

  // Listado de directorio tiene prioridad: cubre patrones con hash impredecible
  // (ej: "1 - a2404c67.webp", "2 - 4b129cdb.webp" …)
  if (directoryFiles.length > 0) {
    return NextResponse.json({ pages: directoryFiles, pattern: 'directory-listing', count: directoryFiles.length });
  }

  const [
    hasSubPad, hasSubDash, hasSubNoPad, hasChapPage4x3, hasParen, hasZeroParen, hasDsP1, hasDsP3, hasCLSubPart,
    hasCopiaPage,
    hasSimple3, has002, has003, hasSimple2, has02, hasZero, hasZero1,
    ...rest
  ] = allResults;
  const prefixResults             = rest.slice(0, prefixVariants.length);
  const pairPrefixResults         = rest.slice(prefixVariants.length, prefixVariants.length + prefixes.length);
  const prefixParenResults        = rest.slice(prefixVariants.length + prefixes.length, prefixVariants.length + prefixes.length * 2);
  const prefixParenChapterResults = rest.slice(prefixVariants.length + prefixes.length * 2);
  const hasDoubleSpaceParen = hasDsP1 || hasDsP3;

  /* ── 2. Evaluar en orden de especificidad ── */

  // Subpart con padding: 01_01.webp
  if (hasSubPad) {
    const pages = await probeSubPart(base, ext, 2, session);
    return NextResponse.json({ pages, pattern: 'subpart-padded', count: pages.length });
  }

  // Subpart con primera página "-1": 01_01-1.webp, 01_02.webp …
  if (hasSubDash) {
    const pages = await probeSubPartDash(base, ext, session);
    return NextResponse.json({ pages, pattern: 'subpart-dash', count: pages.length });
  }

  // Subpart sin padding: 1_01.webp
  if (hasSubNoPad) {
    const pages = await probeSubPart(base, ext, 1, session);
    return NextResponse.json({ pages, pattern: 'subpart-nopad', count: pages.length });
  }

  // Stockage-style: 0001_001.jpg (capítulo 1 detectado, sin chapterHint)
  if (hasChapPage4x3) {
    const pages = await probeChapPage4x3(base, ext, 1, session);
    if (pages.length > 0) {
      return NextResponse.json({ pages, pattern: 'chap4x3(1)', count: pages.length });
    }
  }

  // CL-subpart: 1CL_01.webp, 2CL_01.webp …
  if (hasCLSubPart) {
    const pages = await probeCLSubPart(base, ext, session);
    return NextResponse.json({ pages, pattern: 'cl-subpart', count: pages.length });
  }

  // Patrón "0 (N).webp": 0 (1).webp → almacenado como 0%20(1).webp (parte cero-indexada)
  if (hasZeroParen) {
    const pages = await probeParenPart(base, ext, session, 0);
    return NextResponse.json({ pages, pattern: 'zero-paren-part', count: pages.length });
  }

  // Patrón "N (M).webp": 1 (1).webp → almacenado como 1%20(1).webp
  if (hasParen) {
    const pages = await probeParenPart(base, ext, session);
    return NextResponse.json({ pages, pattern: 'paren-part', count: pages.length });
  }

  // Slug textual: c-463-ingeniero_01.webp / c-463-ingeniero.webp
  // Se activa cuando el usuario proporciona el nombre base de las páginas (sin extensión).
  // Cubre el caso donde el prefijo contiene una palabra en lugar de un número.
  if (slugHint) {
    const prefix = String(slugHint).replace(/\.[a-z0-9]+$/i, '').trim();
    if (prefix) {
      // Multi-página con sufijo _NN: c-463-ingeniero_01.webp, c-463-ingeniero_02.webp …
      if (await exists(base + `${prefix}_01.${ext}`, session)) {
        const pages = await probePagesOfPart(base, ext, prefix, session);
        if (pages.length > 0) {
          return NextResponse.json({ pages, pattern: `slug(${prefix})`, count: pages.length });
        }
      }
      // Página única (sin sufijo numérico): c-463-ingeniero.webp
      if (await exists(base + `${prefix}.${ext}`, session)) {
        return NextResponse.json({ pages: [`${prefix}.${ext}`], pattern: 'slug-single', count: 1 });
      }
    }
  }

  // Patrón "  (N).webp": %20%20(3).webp (dos espacios antes del paréntesis)
  if (hasDoubleSpaceParen) {
    const pages = await probeDoubleSpaceParen(base, ext, session);
    return NextResponse.json({ pages, pattern: 'double-space-paren', count: pages.length });
  }

  // Prefijo dinámico con chapterHint: c-743-54_01.webp / 3_1_01.webp / 3_01_01.webp
  if (chapterHint != null && !isNaN(Number(chapterHint))) {
    const chNum = Math.floor(Number(chapterHint));

    // Stockage-style con chapterHint: 0002_001.jpg (4-digit chap + 3-digit page)
    const chNumPad = String(chNum).padStart(4, '0');
    if (!hasChapPage4x3 && await exists(base + `${chNumPad}_001.${ext}`, session)) {
      const pages = await probeChapPage4x3(base, ext, chNum, session);
      if (pages.length > 0) {
        return NextResponse.json({ pages, pattern: `chap4x3(${chNum})`, count: pages.length });
      }
    }

    // Chapter-subpart: detectar variante unpadded (3_1_01) y padded (3_01_01) en paralelo
    const [hasChUnpad, hasChPad] = await Promise.all([
      exists(base + `${chNum}_1_01.${ext}`, session),
      exists(base + `${chNum}_01_01.${ext}`, session),
    ]);
    if (hasChUnpad || hasChPad) {
      const padPart = hasChPad && !hasChUnpad ? 2 : 1;
      // Recoger portadas simples (1.webp, 2.webp…) que preceden al contenido del capítulo
      const coverPages   = hasZero1 ? await probeSimple(base, ext, 1, 1, 0, session) : [];
      const contentPages = await probeChapterSubPart(base, ext, chNum, padPart, session);
      const pages = [...coverPages, ...contentPages];
      if (pages.length > 0) {
        return NextResponse.json({ pages, pattern: `chapter-subpart(${chNum},pad=${padPart})`, count: pages.length });
      }
    }

    // Prefixed-subpart con chapterHint: c-743-54_01.webp
    for (const { prefix, padPart } of prefixVariants) {
      const pp = String(chNum).padStart(padPart, '0');
      if (await exists(base + `${prefix}${pp}_01.${ext}`, session)) {
        const pages = await probePagesOfPart(base, ext, `${prefix}${pp}`, session);
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
      const pages = await probePrefixedSubPart(base, ext, prefix, padPart, session);
      if (pages.length > 0) {
        return NextResponse.json({ pages, pattern: `prefixed(${prefix})`, count: pages.length });
      }
    }
  }

  // Patrón par prefijado: c-231-1-2.webp, c-231-2-3.webp …
  for (let i = 0; i < prefixes.length; i++) {
    if (pairPrefixResults[i]) {
      const pages = await probePrefixedPair(base, ext, prefixes[i], session);
      if (pages.length > 0) {
        return NextResponse.json({ pages, pattern: `prefixed-pair(${prefixes[i]})`, count: pages.length });
      }
    }
  }

  // Patrón prefijo + paréntesis: c-65-1%20(1).webp / c-65-3%20(1).webp …
  // Quick check parte 1
  for (let i = 0; i < prefixes.length; i++) {
    if (prefixParenResults[i]) {
      const pages = await probePrefixedParenPart(base, ext, prefixes[i], session, 1);
      if (pages.length > 0) {
        return NextResponse.json({ pages, pattern: `prefixed-paren(${prefixes[i]})`, count: pages.length });
      }
    }
  }
  // Quick check con chapterHint como número de parte
  const chapterHintNum = (chapterHint != null && !isNaN(Number(chapterHint))) ? Math.floor(Number(chapterHint)) : null;
  if (chapterHintNum != null && chapterHintNum > 1) {
    for (let i = 0; i < prefixes.length; i++) {
      if (prefixParenChapterResults[i]) {
        const pages = await probePrefixedParenPart(base, ext, prefixes[i], session, chapterHintNum);
        if (pages.length > 0) {
          return NextResponse.json({ pages, pattern: `prefixed-paren(${prefixes[i]})`, count: pages.length });
        }
      }
    }
  }

  // Patrón "NN copia.webp": 01 copia.webp, 02 copia.webp …
  if (hasCopiaPage) {
    const pages = await probeCopiaPages(base, ext, session);
    return NextResponse.json({ pages, pattern: 'copia-pages', count: pages.length });
  }

  // Scan profundo: busca en lote cualquier número de parte (capítulos 4+)
  // Resuelve el caso c-743-54_01.webp cuando no se proporcionó chapterHint.
  // Se omite para CDNs conocidos (ej: ikigaimangas) donde estos patrones no existen,
  // evitando cientos de peticiones secuenciales innecesarias antes de llegar a simple-3digit.
  if (!autoViewerUrl) {
    for (const { prefix, padPart } of prefixVariants) {
      const pages = await probePrefixedSubPartDeep(base, ext, prefix, padPart, session);
      if (pages.length > 0) {
        return NextResponse.json({ pages, pattern: `prefixed(${prefix})`, count: pages.length });
      }
    }

    // Scan profundo chapter-subpart sin chapterHint: N_1_01.webp / N_01_01.webp
    const contentPages = await probeChapterSubPartDeep(base, ext, session);
    if (contentPages.length > 0) {
      const coverPages = hasZero1 ? await probeSimple(base, ext, 1, 1, 0, session) : [];
      const pages = [...coverPages, ...contentPages];
      return NextResponse.json({ pages, pattern: 'chapter-subpart', count: pages.length });
    }
  }

  // Simple 3 dígitos: 001.webp
  if (hasSimple3) {
    const pages = await probeSimple(base, ext, 1, 3, 2, session);
    return NextResponse.json({ pages, pattern: 'simple-3digit', count: pages.length });
  }

  // Patrón ikigaimangas fallback: páginas desde 002.webp (sin 001.webp).
  // La portada usa nombre descriptivo (ej: 00_portada_blue_lock.webp) y no es
  // detectable sin visor. Se recogen las páginas numeradas desde 002 en adelante.
  if (has002 && !hasSimple3) {
    const pages = await probeSimple(base, ext, 2, 3, 2, session);
    if (pages.length > 0) {
      return NextResponse.json({ pages, pattern: 'simple-3digit-from-002', count: pages.length });
    }
  }

  // Patrón ikigaimangas fallback: portada 0.webp + páginas desde 003.webp (sin 001 ni 002).
  if (has003 && !hasSimple3 && !has002) {
    const portada = hasZero ? [`0.${ext}`] : [];
    const pages = await probeSimple(base, ext, 3, 3, 2, session);
    if (pages.length > 0) {
      return NextResponse.json({ pages: [...portada, ...pages], pattern: 'simple-3digit-from-003', count: portada.length + pages.length });
    }
  }

  // Patrón ikigaimangas fallback genérico: portada 0.webp + páginas 3-digit desde offset
  // desconocido (ej: 010.webp, 020.webp …). Solo se activa para CDNs conocidos donde el
  // auto-viewer falló y los checks estándar (001-003) no encontraron nada.
  if (autoViewerUrl && !hasSimple3 && !has002 && !has003) {
    const portada = hasZero ? [`0.${ext}`] : [];
    // Buscar primer archivo 3-digit desde 004 hasta 100 (001-003 ya probados arriba)
    const start = await findSimpleStart(base, ext, 4, 100, 3, session);
    if (start !== null) {
      const pages = await probeSimple(base, ext, start, 3, 2, session);
      if (pages.length > 0) {
        return NextResponse.json({
          pages: [...portada, ...pages],
          pattern: `simple-3digit-from-${String(start).padStart(3, '0')}`,
          count: portada.length + pages.length,
        });
      }
    }
  }

  // Simple 2 dígitos: 01.webp
  // Para CDNs conocidos (ikigaimangas) se usa mayor tolerancia a huecos porque
  // los capítulos pueden tener páginas saltadas (ej: 01, gap de 5, 07, 08 …).
  if (hasSimple2) {
    const pages = await probeSimple(base, ext, 1, 2, autoViewerUrl ? 10 : 2, session);
    return NextResponse.json({ pages, pattern: 'simple-2digit', count: pages.length });
  }

  // Patrón ikigaimangas fallback: páginas 2-digit desde 02.webp (sin 01.webp).
  // La portada usa nombre descriptivo y no es detectable sin visor.
  if (has02 && !hasSimple2) {
    const pages = await probeSimple(base, ext, 2, 2, 2, session);
    if (pages.length > 0) {
      return NextResponse.json({ pages, pattern: 'simple-2digit-from-02', count: pages.length });
    }
  }

  // Zero-indexed: 0.webp (requiere que 1.webp también exista para evitar falsos positivos)
  if (hasZero && hasZero1) {
    const pages = await probeSimple(base, ext, 0, 1, 2, session);
    return NextResponse.json({ pages, pattern: 'zero-indexed', count: pages.length });
  }

  // Simple 1 dígito desde 1: 1.webp, 2.webp, 3.webp …
  if (hasZero1) {
    const pages = await probeSimple(base, ext, 1, 1, 2, session);
    return NextResponse.json({ pages, pattern: 'simple-1digit', count: pages.length });
  }

  return NextResponse.json(
    {
      error: 'No se detectó ningún patrón conocido. Verifica que la URL base sea correcta y termine en /. Si los archivos usan hash aleatorio, proporciona viewerUrl o una plantilla del lector.',
      pages: [],
    },
    { status: 404 },
  );
}
