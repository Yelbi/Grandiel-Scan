import { NextRequest } from 'next/server';

const TIMEOUT_MS        = 6_000;
const BATCH_SIZE        = 16;
const MAX_RANGE         = 100_000;
const IMGUR_PLACEHOLDER = 'imgur.com/w33tpvZ';

// Patrones estándar de primera página (nombre base sin extensión), en orden de probabilidad
const STD_PATTERNS = ['1', '01', '001', '01_01', '1_01'] as const;

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
    if (res.status === 200 || res.status === 206) {
      if (res.url.includes(IMGUR_PLACEHOLDER)) return false;
      return true;
    }
    if (!prefersGet && (res.status === 403 || res.status === 405)) {
      prefersGet = true;
      const r2 = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GrandielProbe/1.0)', Range: 'bytes=0-0' },
      });
      if (r2.status === 200 || r2.status === 206) {
        if (r2.url.includes(IMGUR_PLACEHOLDER)) return false;
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

function jsonError(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return jsonError('Solo disponible en desarrollo local.', 403);
  }

  const body = await req.json();
  const { comicBase, folderStart, folderEnd, ext = 'webp', slugHint } = body;

  if (!comicBase || folderStart == null || folderEnd == null) {
    return jsonError('comicBase, folderStart y folderEnd son requeridos.', 400);
  }

  const start = Number(folderStart);
  const end   = Number(folderEnd);

  if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
    return jsonError('Rango inválido.', 400);
  }
  if (end - start + 1 > MAX_RANGE) {
    return jsonError(`Rango demasiado grande. Máximo ${MAX_RANGE.toLocaleString()} folders por escaneo.`, 400);
  }

  const base     = (comicBase as string).replace(/\/$/, '');
  const slugBase = slugHint ? String(slugHint).replace(/\.[a-z0-9]+$/i, '').trim() : '';
  const patterns: string[] = [
    ...(slugBase ? [`${slugBase}_01`, slugBase] : []),
    ...STD_PATTERNS,
  ];
  const allFolders = Array.from({ length: end - start + 1 }, (_, k) => start + k);
  const total      = allFolders.length;
  const encoder    = new TextEncoder();

  prefersGet = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const foundSet    = new Set<number>();
        const patternCount = patterns.length;

        for (let pIdx = 0; pIdx < patterns.length; pIdx++) {
          const pattern   = patterns[pIdx];
          const remaining = allFolders.filter((f) => !foundSet.has(f));
          if (!remaining.length) break;

          let scannedInPattern = 0;
          for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
            const chunk   = remaining.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(
              chunk.map((fid) => quickExists(`${base}/${fid}/${pattern}.${ext}`)),
            );
            chunk.forEach((fid, k) => {
              if (results[k] && !foundSet.has(fid)) {
                foundSet.add(fid);
                send({ type: 'hit', folderId: fid });
              }
            });
            scannedInPattern += chunk.length;
            send({ type: 'progress', scanned: scannedInPattern, total, pattern, patternIdx: pIdx, patternCount });
          }
        }

        send({ type: 'done', total, count: foundSet.size });
      } catch (err) {
        send({ type: 'error', message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}
