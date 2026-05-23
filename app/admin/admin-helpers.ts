export type HtmlChapterEntry = {
  chapter: number;
  folderId: string;
  viewerUrl?: string;
};

export function titleToId(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function generatePages(count: number, ext: string): string[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const pad = n < 10 ? `0${n}` : `${n}`;
    return `${pad}.${ext}`;
  });
}

export function parseManualPages(raw: string): string[] {
  return raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
}

export function parseNonNegativeNum(raw: string): number | null {
  const num = Number(raw);
  if (!isFinite(num) || num < 0) return null;
  return num;
}

export function buildViewerUrl(template: string, folderId: string, chapter: number): string {
  return template
    .replace(/\{folderId\}/g, folderId)
    .replace(/\{chapter\}/g, String(chapter));
}

export function parseBulkList(raw: string): Array<{ chapter: number; folderId: string; viewerUrl?: string }> {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const m = line.match(/^(\d+(?:[.,]\d+)?)\s*[:\-,\s]\s*(\S+)(.*)$/);
      if (!m) return [];
      const chapter  = Number(m[1]);
      const folderId = m[2].replace(/[:|,]+$/, '');
      let viewerUrl: string | undefined;
      const tail = m[3]?.trim() ?? '';
      if (tail) {
        const cleaned = tail.replace(/^[:|,\s-]+/, '').trim();
        if (/^https?:\/\//i.test(cleaned) || cleaned.startsWith('/')) viewerUrl = cleaned;
      }
      return [{ chapter, folderId, ...(viewerUrl ? { viewerUrl } : {}) }];
    });
}

export function parseHtmlChapterEntries(html: string): HtmlChapterEntry[] {
  const entries: HtmlChapterEntry[] = [];
  const seen = new Set<string>();

  function toViewerUrl(href: string): string | undefined {
    const normalized = href.trim();
    if (!normalized) return undefined;
    if (/^https?:\/\//i.test(normalized)) return normalized;
    if (normalized.startsWith('/')) return normalized;
    return undefined;
  }

  function pushEntry(entry: HtmlChapterEntry) {
    const key = `${entry.chapter}:${entry.folderId}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push(entry);
  }

  function chapterFromChunk(chunk: string): number | null {
    const match = /(?:Cap[ií]tulo|Chapitre|Chapter)(?:&nbsp;|\s)+(\d+(?:[.,]\d+)?)/i.exec(chunk);
    if (!match) return null;
    const raw = match[1].replace(',', '.');
    const chapter = Number(raw);
    return isFinite(chapter) && chapter >= 0 ? chapter : null;
  }

  let match;

  const re1 = /<a[^>]+href="([^"]*\/capitulo\/(\d+)\/comic-[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = re1.exec(html)) !== null) {
    const chapter = chapterFromChunk(match[3]);
    if (chapter !== null) pushEntry({ chapter, folderId: match[2], viewerUrl: toViewerUrl(match[1]) });
  }
  if (entries.length > 0) return entries;

  const re4 = /<a[^>]+href="([^"]*\/capitulo\/(\d+)\/[^"\/][^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = re4.exec(html)) !== null) {
    const chapter = chapterFromChunk(match[3]);
    if (chapter !== null) pushEntry({ chapter, folderId: match[2], viewerUrl: toViewerUrl(match[1]) });
  }
  if (entries.length > 0) return entries;

  const re3 = /<a[^>]+href="([^"]*\/capitulo\/(\d+)\/)"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = re3.exec(html)) !== null) {
    const innerHtml = match[3];
    let chapMatch = /alt="Cap[ií]tulo\s+(\d+(?:[.,]\d+)?)"/i.exec(innerHtml);
    if (!chapMatch) {
      const stripped = innerHtml.replace(/<!--[\s\S]*?-->/g, '');
      chapMatch = /Cap[ií]tulo\s+(\d+(?:[.,]\d+)?)/i.exec(stripped);
    }
    if (chapMatch) {
      const chapter = Number(chapMatch[1].replace(',', '.'));
      if (isFinite(chapter) && chapter >= 0) pushEntry({ chapter, folderId: match[2], viewerUrl: toViewerUrl(match[1]) });
    }
  }
  if (entries.length > 0) return entries;

  const re5 = /<a[^>]+href="([^"]*\/chapitre-([\d]+(?:-[\d]+)?)\/)"[^>]*>/gi;
  while ((match = re5.exec(html)) !== null) {
    const chapStr  = match[2].replace(/-(\d+)$/, '.$1');
    const chapter  = Number(chapStr);
    if (isFinite(chapter) && chapter >= 0) pushEntry({ chapter, folderId: String(chapter), viewerUrl: toViewerUrl(match[1]) });
  }
  if (entries.length > 0) return entries;

  const re2 = /<a[^>]+href="([^"]*\/manga\/\d+\/capitulo\/(\d+))"[^>]*>/gi;
  while ((match = re2.exec(html)) !== null) {
    const chapter = Number(match[2]);
    if (Number.isInteger(chapter) && chapter >= 0) pushEntry({ chapter, folderId: String(chapter), viewerUrl: toViewerUrl(match[1]) });
  }

  const re6 = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = re6.exec(html)) !== null) {
    if (!/class="[^"]*chapternum[^"]*"/i.test(match[2])) continue;
    const chapter = chapterFromChunk(match[2]);
    if (chapter !== null) pushEntry({ chapter, folderId: String(chapter), viewerUrl: toViewerUrl(match[1]) });
  }

  return entries;
}

export function parseCdnUrlList(raw: string): { base: string; entries: Array<{ chapter: number; folderId: string }> } | null {
  const lines   = raw.split('\n').map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l));
  if (!lines.length) return null;
  const urlPat  = /^(https?:\/\/.+)\/(\d+)\/[^/]+$/;
  const baseSet = new Set<string>();
  const chapMap = new Map<number, string>();
  for (const url of lines) {
    const m = url.match(urlPat);
    if (!m) continue;
    baseSet.add(m[1]);
    const ch = Number(m[2]);
    if (isFinite(ch) && !chapMap.has(ch)) chapMap.set(ch, m[2]);
  }
  if (!chapMap.size || baseSet.size !== 1) return null;
  const base    = [...baseSet][0];
  const entries = [...chapMap.entries()].sort((a, b) => a[0] - b[0]).map(([chapter, folderId]) => ({ chapter, folderId }));
  return { base, entries };
}
