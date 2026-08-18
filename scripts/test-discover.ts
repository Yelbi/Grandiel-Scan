/**
 * Pruebas del parser de listas de capítulos (lib/scraper/discover.ts).
 *
 * Ejecutar:  npx tsx scripts/test-discover.ts
 *
 * Los fixtures son HTML sintético que imita la forma de los sitios de origen.
 * Si un origen cambia su maquetación y la sincronización deja de encontrar
 * capítulos, añade aquí un fixture con la forma nueva antes de tocar el parser:
 * así queda claro qué se rompió y no se rompe lo que ya funcionaba.
 */
import { extractChapters, parseChapterNumber } from '../lib/scraper/discover';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else      { fail++; console.log(`  ✗ ${name} ${extra}`); }
}

console.log('\n── parseChapterNumber ──');
const cases: [string, number | null][] = [
  ['Capítulo 45', 45], ['Capitulo 45.5', 45.5], ['Cap. 12', 12], ['Chapter 7', 7],
  ['CAPÍTULO 130', 130], ['#88', 88], ['45', 45], ['45,5', 45.5], ['Ep. 3', 3],
  ['Leer ahora', null], ['Publicado en 2024', null], ['', null],
];
for (const [input, want] of cases) {
  const got = parseChapterNumber(input);
  check(`"${input}" → ${want}`, got === want, `(dio ${got})`);
}

console.log('\n── Estrategia 1: JSON embebido (estilo Inertia) ──');
const inertia = `<!doctype html><html><body>
<div id="app" data-page="${JSON.stringify({
  props: { serie: { id: 168, name: 'Nano Machine' },
    chapters: [
      { id: 42022, name: 'Capítulo 1' },
      { id: 42077, name: 'Capítulo 2' },
      { id: 43001, name: 'Capítulo 14.5' },
      { id: 43010, name: 'Capítulo 15' },
    ] } }).replace(/"/g, '&quot;')}"></div>
</body></html>`;
const r1 = extractChapters(inertia, 'https://ejemplo.com/series/nano-machine');
check('estrategia = json-embebido', r1.strategy === 'json-embebido', `(dio ${r1.strategy})`);
check('detecta 4 capítulos', r1.chapters.length === 4, `(dio ${r1.chapters.length})`);
check('ordenados ascendente', r1.chapters.map(c=>c.chapter).join()==='1,2,14.5,15', `(dio ${r1.chapters.map(c=>c.chapter).join()})`);
check('mapea cap 15 → id 43010', r1.chapters.find(c=>c.chapter===15)?.id === '43010');
check('soporta decimales (14.5)', r1.chapters.some(c=>c.chapter===14.5));

console.log('\n── Estrategia 2: enlaces del HTML ──');
const links = `<!doctype html><html><body>
  <h1>Nano Machine</h1>
  <a href="/">Inicio</a>
  <a href="/series/otra-serie">Otra serie</a>
  <ul>
    <li><a href="/capitulo/42022/"><span>Capítulo 1</span></a></li>
    <li><a href="/capitulo/42077/">Capítulo 2</a></li>
    <li><a href="https://ejemplo.com/capitulo/43010/">Capítulo 15</a></li>
  </ul>
</body></html>`;
const r2 = extractChapters(links, 'https://ejemplo.com/series/nano-machine');
check('estrategia = enlaces-html', r2.strategy === 'enlaces-html', `(dio ${r2.strategy})`);
check('detecta 3 capítulos', r2.chapters.length === 3, `(dio ${r2.chapters.length})`);
check('ignora enlaces que no son capítulos', !r2.chapters.some(c=>c.id==='0'));
check('resuelve URL relativa y absoluta igual', r2.chapters.find(c=>c.chapter===15)?.id === '43010');
check('lee texto dentro de <span>', r2.chapters.find(c=>c.chapter===1)?.id === '42022');

console.log('\n── Número desde el slug (sin texto útil) ──');
const slugOnly = `<a href="/capitulo/50123/capitulo-77/"><img src="x.jpg"></a>`;
const r3 = extractChapters(slugOnly, 'https://ejemplo.com/s/x');
check('saca el 77 del slug', r3.chapters[0]?.chapter === 77, `(dio ${JSON.stringify(r3.chapters)})`);

console.log('\n── Regresión: JSON con objetos que NO son capítulos ──');
// Caso real: olympusxyz.com sirve un bloque JSON con menús/etiquetas cuyos
// objetos tienen {id, name}. La heurística antigua los tomaba por capítulos y
// devolvía 6 falsos con ids de 1-2 cifras, que habrían apuntado a carpetas del
// CDN equivocadas. Un capítulo fantasma es peor que no encontrar ninguno.
const ruido = `<script type="application/json">${JSON.stringify({
  0: { id: 6,  name: '7' },
  1: { id: 11, name: 'Acción' },
  2: { id: 24, title: '23' },
  3: { id: 32, slug: 'terror' },
  4: { id: 41, name: 'Publicado 2026' },
})}</script>`;
const rRuido = extractChapters(ruido, 'https://ejemplo.com/series/x');
check('no confunde {id,name} suelto con capítulos', rRuido.chapters.length === 0,
      `(dio ${rRuido.chapters.length}: ${JSON.stringify(rRuido.chapters)})`);

console.log('\n── Pero sí acepta capítulos etiquetados de verdad ──');
const bueno = `<script type="application/json">${JSON.stringify({
  chapters: [
    { id: 33433, name: 'Capítulo 1' },
    { id: 42022, number: 168.2 },
  ],
})}</script>`;
const rBueno = extractChapters(bueno, 'https://ejemplo.com/series/x');
check('lee texto etiquetado y clave numérica explícita', rBueno.chapters.length === 2,
      `(dio ${rBueno.chapters.length})`);
check('conserva el decimal 168.2', rBueno.chapters.some(c => c.chapter === 168.2));

console.log('\n── Página sin lista de capítulos ──');
const r4 = extractChapters('<html><body><p>Nada por aquí</p></body></html>', 'https://ejemplo.com/');
check('devuelve error explicativo', r4.chapters.length === 0 && !!r4.error);
check('estrategia = ninguna', r4.strategy === 'ninguna');

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} pasaron, ${fail} fallaron\n`);
if (fail > 0) process.exit(1);
