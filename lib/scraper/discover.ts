/**
 * Descubrimiento de capítulos publicados en la página de una serie del sitio de origen.
 *
 * El problema que resuelve: los capítulos se guardan como
 * `{cdnBase}/{chapterId}/`, y ese `chapterId` es un contador global del CDN, no
 * un número por serie. Entre el capítulo 7 de una serie (43629) y el 8 pueden
 * pasar miles de ids de otras series, así que rastrear por fuerza bruta no es
 * viable en un cron. La única fuente fiable de "qué capítulos existen y con qué
 * id" es la propia página de la serie.
 *
 * No se usan selectores CSS atados al diseño de cada sitio: se rediseñan a
 * menudo y romperían la sincronización en silencio. En su lugar hay dos
 * estrategias genéricas en cascada, de más fiable a más tolerante.
 */

const TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 8 * 1024 * 1024;

/** Un capítulo visto en el sitio de origen. */
export interface DiscoveredChapter {
  /** Número de capítulo tal como lo publica el origen (admite decimales: 45.5). */
  chapter: number;
  /** Identificador del capítulo, el que va en la URL del CDN. */
  id: string;
}

export interface DiscoverResult {
  chapters: DiscoveredChapter[];
  /** Estrategia que acabó dando resultado, útil para depurar desde el admin. */
  strategy: 'json-embebido' | 'enlaces-html' | 'ninguna';
  /** Mensaje legible cuando no se encontró nada. */
  error?: string;
}

/* ── Utilidades ────────────────────────────────────────────────────────── */

/**
 * Extrae el número de capítulo de un texto libre.
 * Cubre "Capítulo 45", "Cap. 45.5", "Chapter 45", "#45" y "45".
 * Devuelve null si no hay un número plausible.
 */
export function parseChapterNumber(raw: string): number | null {
  if (!raw) return null;
  const text = raw.replace(/\s+/g, ' ').trim();

  // Con etiqueta delante: "Capítulo 45", "Cap 45.5", "Chapter 45", "Ep. 45"
  const labelled = text.match(
    /(?:cap[ií]tulo|capitulo|chapter|cap|ch|ep(?:isodio)?)\s*\.?\s*#?\s*(\d+(?:[.,]\d+)?)/i,
  );
  if (labelled) return normalizeNum(labelled[1]);

  // Con almohadilla: "#45"
  const hashed = text.match(/#\s*(\d+(?:[.,]\d+)?)/);
  if (hashed) return normalizeNum(hashed[1]);

  // El texto es solo el número: "45" o "45.5"
  const bare = text.match(/^(\d+(?:[.,]\d+)?)$/);
  if (bare) return normalizeNum(bare[1]);

  return null;
}

function normalizeNum(s: string): number | null {
  const n = Number(s.replace(',', '.'));
  // Se descartan números absurdos: suelen ser años, ids o precios colados.
  if (!Number.isFinite(n) || n < 0 || n > 100_000) return null;
  return n;
}

/**
 * Extrae el número de capítulo del slug de una URL.
 * "…/capitulo-45-5/" → 45.5 ; "…/capitulo-45/" → 45
 */
function chapterNumberFromSlug(pathname: string): number | null {
  const m = pathname.match(/(?:cap[ií]tulo|capitulo|chapter|cap)[-_](\d+)(?:[-_](\d+))?/i);
  if (!m) return null;
  return normalizeNum(m[2] ? `${m[1]}.${m[2]}` : m[1]);
}

/** Descarga la página respetando un límite de tamaño y un timeout. */
async function fetchHtml(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`El origen respondió ${res.status}`);

    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared > MAX_HTML_BYTES) throw new Error('La página del origen es demasiado grande');

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_HTML_BYTES) throw new Error('La página del origen es demasiado grande');
    return new TextDecoder('utf-8').decode(buf);
  } finally {
    clearTimeout(timer);
  }
}

/* ── Estrategia 1: JSON embebido ───────────────────────────────────────────
   Olympus e Ikigai son aplicaciones Laravel/Inertia y Next: la lista de
   capítulos viaja como JSON dentro del HTML (data-page="…", __NEXT_DATA__,
   __INITIAL_STATE__…) antes de que el navegador la pinte. Leer ese JSON es
   mucho más estable que raspar el DOM resultante.                        ── */

/** Recorre un JSON arbitrario y recolecta cualquier objeto con pinta de capítulo. */
function harvestChaptersFromJson(node: unknown, out: Map<number, string>, depth = 0): void {
  if (depth > 12 || node === null || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) harvestChaptersFromJson(item, out, depth + 1);
    return;
  }

  const obj = node as Record<string, unknown>;

  // ¿Tiene forma de capítulo? Necesita un id y algo que indique el número.
  const idRaw = obj.id ?? obj.chapter_id ?? obj.chapterId;
  const numRaw =
    obj.number ?? obj.chapter ?? obj.chapter_number ?? obj.num ?? obj.name ?? obj.title ?? obj.slug;

  if (idRaw != null && numRaw != null) {
    const id = String(idRaw).trim();
    // El id debe ser el numérico que usa el CDN en la ruta.
    if (/^\d+$/.test(id)) {
      const num =
        typeof numRaw === 'number' ? normalizeNum(String(numRaw)) : parseChapterNumber(String(numRaw));
      if (num !== null && !out.has(num)) out.set(num, id);
    }
  }

  for (const value of Object.values(obj)) harvestChaptersFromJson(value, out, depth + 1);
}

function discoverFromEmbeddedJson(html: string): Map<number, string> {
  const found = new Map<number, string>();

  const candidates: string[] = [];

  // Inertia: <div id="app" data-page="{&quot;props&quot;:…}">
  for (const m of html.matchAll(/data-page="([^"]+)"/g)) {
    candidates.push(decodeHtmlEntities(m[1]));
  }
  // Next.js y patrones habituales de estado inicial
  for (const re of [
    /<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/gi,
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/gi,
    /window\.__NUXT__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/gi,
    /<script[^>]+type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi,
  ]) {
    for (const m of html.matchAll(re)) candidates.push(m[1]);
  }

  for (const raw of candidates) {
    try {
      harvestChaptersFromJson(JSON.parse(raw.trim()), found);
    } catch {
      // Fragmento que no era JSON válido; se prueba el siguiente.
    }
  }

  return found;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/* ── Estrategia 2: enlaces del HTML ────────────────────────────────────────
   Respaldo para sitios que sí renderizan la lista en el servidor. Se buscan
   los <a> cuya URL tenga forma de capítulo y se saca el número del texto del
   enlace o, si no, del propio slug.                                      ── */

const CHAPTER_HREF = /\/(?:capitulo|capítulo|chapter|leer|ver|cap)[/-]([^/?#"']+)/i;

function discoverFromHtmlLinks(html: string, pageUrl: string): Map<number, string> {
  const found = new Map<number, string>();

  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = decodeHtmlEntities(m[1]);
    // Texto del enlace sin etiquetas internas (<span>, <i>…).
    const text = decodeHtmlEntities(m[2].replace(/<[^>]*>/g, ' ')).trim();

    let url: URL;
    try {
      url = new URL(href, pageUrl);
    } catch {
      continue;
    }

    const hrefMatch = url.pathname.match(CHAPTER_HREF);
    if (!hrefMatch) continue;

    // El id del capítulo es el primer tramo numérico de la ruta del capítulo.
    const idMatch = url.pathname.match(/\/(?:capitulo|capítulo|chapter|leer|ver|cap)\/(\d+)/i);
    const id = idMatch?.[1];
    if (!id) continue;

    const num = parseChapterNumber(text) ?? chapterNumberFromSlug(url.pathname);
    if (num === null) continue;

    if (!found.has(num)) found.set(num, id);
  }

  return found;
}

/* ── Punto de entrada ──────────────────────────────────────────────────── */

/**
 * Lee la página de una serie y devuelve los capítulos publicados, ordenados.
 * Nunca lanza: los fallos vuelven como `error` para que el cron los registre
 * y siga con el siguiente manga en vez de abortar la pasada entera.
 */
export async function discoverChapters(sourceUrl: string): Promise<DiscoverResult> {
  let html: string;
  try {
    html = await fetchHtml(sourceUrl);
  } catch (err) {
    return {
      chapters: [],
      strategy: 'ninguna',
      error: err instanceof Error ? err.message : 'No se pudo descargar la página del origen',
    };
  }
  return extractChapters(html, sourceUrl);
}

/**
 * Aplica las dos estrategias sobre un HTML ya descargado.
 * Separado de la descarga para poder probarlo con fixtures, sin red.
 */
export function extractChapters(html: string, pageUrl: string): DiscoverResult {
  const fromJson = discoverFromEmbeddedJson(html);
  if (fromJson.size > 0) {
    return { chapters: toSortedList(fromJson), strategy: 'json-embebido' };
  }

  const fromLinks = discoverFromHtmlLinks(html, pageUrl);
  if (fromLinks.size > 0) {
    return { chapters: toSortedList(fromLinks), strategy: 'enlaces-html' };
  }

  return {
    chapters: [],
    strategy: 'ninguna',
    error:
      'No se reconoció ninguna lista de capítulos en esa página. Comprueba que la URL sea la de la serie (la que lista los capítulos) y no la de un capítulo suelto ni la portada del sitio.',
  };
}

function toSortedList(map: Map<number, string>): DiscoveredChapter[] {
  return [...map.entries()]
    .map(([chapter, id]) => ({ chapter, id }))
    .sort((a, b) => a.chapter - b.chapter);
}
