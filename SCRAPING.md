# Sincronización automática de capítulos

Busca capítulos nuevos en los sitios de origen cada 3 horas y los da de alta solo,
con la misma semántica que el alta manual: actualiza `latestChapter`, invalida las
cachés y manda el aviso push a quien tenga el manga en favoritos.

---

## Por qué no bastaba con lo que ya había

El panel tenía **Auto-Descubrir**, que rastrea por fuerza bruta un rango de ids de
carpeta (`scan-folders`) y luego sondea cada acierto. Sirve para importar el archivo
histórico de una serie, pero no como tarea periódica, y la razón está en los datos:

```
maldita-reencarnacion  serie 154  caps 1→7    ids 43582 … 43629
worlds-apocalipse      serie 27   cap  1      id  53620
```

Los ids de capítulo son un **contador global del CDN**, no una numeración por serie.
Un capítulo publicado hoy recibe un id lejísimos del último que tengas guardado, así
que "seguir contando" desde el último id no encuentra nada, y barrer el rango entero
son decenas de miles de peticiones por pasada.

La única fuente fiable de *qué capítulos existen y con qué id* es la propia página de
la serie en el sitio de origen. De ahí sale todo lo demás.

---

## Cómo funciona

```
   página de la serie (origen)
            │
            ▼
   discover.ts ─── lista [{ capítulo, id }]
            │
            ▼
   diferencia contra la base de datos
            │
            ▼
   probe.ts ─────  nombres de archivo de las páginas
            │
            ▼
   INSERT + latestChapter + revalidar + push
```

| Archivo | Qué hace |
|---|---|
| `lib/scraper/discover.ts` | Lee la página de la serie y saca `[{ capítulo, id }]` |
| `lib/scraper/probe.ts` | Dada la carpeta del capítulo, deduce los nombres de sus páginas |
| `lib/scraper/sync.ts` | Encadena todo, con presupuesto de tiempo y registro |
| `app/api/cron/sync/route.ts` | Endpoint que dispara GitHub Actions |
| `app/api/admin/source/route.ts` | Configurar orígenes y probar desde el admin |
| `app/admin/tabs/SourcesTab.tsx` | Pestaña **Automático** del panel |

`probe.ts` es la lógica que ya vivía dentro de `app/api/admin/probe-chapter/route.ts`
(1333 líneas de detección de patrones de nombres). Se extrajo tal cual a `lib/` para
que el cron pueda usarla directamente: `/api/admin/*` está detrás del Basic Auth del
middleware, así que llamarse a sí mismo por HTTP no era opción. La ruta quedó como un
envoltorio de 27 líneas y su comportamiento externo no cambia.

### Las dos estrategias de lectura

`discover.ts` **no usa selectores CSS**. Un selector atado al diseño de cada sitio se
rompe en el primer rediseño y la sincronización se queda muda sin que nadie se entere.
En su lugar hay dos estrategias genéricas en cascada:

1. **JSON embebido** — Olympus e Ikigai son aplicaciones Laravel/Inertia: la lista de
   capítulos viaja como JSON dentro del HTML (`data-page="…"`, `__NEXT_DATA__`,
   `__INITIAL_STATE__`) antes de que el navegador la pinte. Se recorre ese JSON
   buscando objetos con forma de capítulo (un id numérico + algo que dé el número).
2. **Enlaces del HTML** — respaldo para sitios renderizados en servidor: se buscan los
   `<a>` cuya URL tenga forma de capítulo y se saca el número del texto del enlace o,
   si no lo hay, del slug.

Si ninguna encuentra nada, devuelve un error explicativo en vez de fallar en silencio.

Hay pruebas con fixtures sintéticos:

```bash
npm run test:discover
```

Cuando un origen cambie de maquetación y deje de detectar capítulos, **añade primero
un fixture con la forma nueva** y luego toca el parser.

---

## Puesta en marcha

### 1. Migración de la base de datos

Supabase → **SQL Editor** → pegar y ejecutar
[`scripts/sql/001-sincronizacion-automatica.sql`](scripts/sql/001-sincronizacion-automatica.sql).
Es idempotente. Añade cinco columnas a `mangas` y la tabla `sync_runs`.

### 2. Secrets en GitHub

Repo → Settings → Secrets and variables → **Actions**:

| Secret | Valor |
|---|---|
| `SITE_URL` | `https://grandielscan.com` |
| `CRON_SECRET` | El mismo valor que la variable `CRON_SECRET` de Vercel |

### 3. Configurar cada manga

Panel `/admin` → pestaña **Automático**. Por cada serie hacen falta dos datos:

- **URL de la serie en el origen** — la página que lista los capítulos.
  No la de un capítulo suelto ni la portada del sitio.
- **Base del CDN** — exactamente el `comicBase` que ya escribes en Auto-Descubrir,
  sin el id del capítulo:
  `https://dashboard.olympusscans.com/storage/comics/168`

Luego, en este orden:

1. **Guardar**
2. **Probar lectura del origen** — dice cuántos capítulos ve y por qué estrategia.
   Si aquí sale 0, la URL de la serie no es la correcta.
3. **Simular (sin guardar)** — hace la pasada completa sin tocar la base de datos.
4. Marcar **Sincronizar automáticamente** y guardar.

Los botones de simular y sincronizar leen lo guardado, no lo que hay en pantalla:
guarda antes de usarlos.

### 4. Comprobar el workflow

Repo → Actions → **Sincronizar capítulos** → *Run workflow*, marcando *dry run* la
primera vez. El resumen del run dice cuántos mangas revisó y cuántos capítulos entraron.

---

## Operación

**Historial.** La pestaña **Automático** muestra las últimas 60 pasadas con su
resultado y el motivo de los fallos. Es el primer sitio donde mirar cuando una serie
deja de actualizarse. Las filas de más de 30 días las borra el cron diario de limpieza.

**Ritmo.** Cada pasada revisa hasta 10 mangas, empezando por los que llevan más tiempo
sin revisarse, con un tope de 5 capítulos nuevos por manga. Con 8 pasadas al día eso
son hasta 80 revisiones diarias: de sobra para un catálogo de 71 series. Si la cola no
cabe en el presupuesto de 50 s, la respuesta trae `budgetExhausted: true` y la
siguiente pasada continúa donde se quedó — ningún manga se salta su turno.

**Un solo aviso por manga.** Si entran cinco capítulos de golpe, sale una única
notificación ("5 capítulos nuevos"), no cinco.

**`lastSyncedAt` se actualiza también cuando falla.** Si no, un manga cuyo origen está
caído se quedaría clavado al frente de la cola bloqueando a los demás en cada pasada.

### Cuando algo falla

| Síntoma en el historial | Causa habitual |
|---|---|
| `❌ No se reconoció ninguna lista de capítulos` | La URL de la serie no es la que lista capítulos, o el sitio cambió de maquetación |
| `❌ El origen respondió 403` | Te están bloqueando: baja la frecuencia del workflow |
| `⚠️ parcial — cap. N: no se detectaron páginas` | El capítulo existe en el origen pero su carpeta del CDN aún está vacía o usa un patrón nuevo. Suele arreglarse solo en la siguiente pasada |
| `⏭️ sin configurar` | Le falta la URL de la serie o la base del CDN |

---

## Límites conocidos

- **Depende de la maquetación ajena.** Ningún parser genérico sobrevive a cualquier
  rediseño. Cuando uno rompa, el historial lo dirá y hay que añadir un fixture.
- **Un origen por manga.** Si una serie se mueve de sitio, hay que reconfigurarla.
- **La numeración la manda el origen.** Si allí publican mal un número, aquí entra mal.
  Los capítulos ya existentes nunca se sobrescriben, solo se añaden los que faltan.
- **60 s por pasada** es el techo del plan Hobby de Vercel (`maxDuration`). Subir el
  `limit` por encima de 10 solo hará que se agote el presupuesto antes.

## Riesgos que conviene tener presentes

Esto automatiza peticiones periódicas a servidores de terceros y sirve imágenes
alojadas en sus CDNs. En la práctica eso significa:

- **Bloqueos.** Las peticiones salen desde IPs de Vercel, compartidas y fáciles de
  identificar. Si un origen empieza a devolver 403, la sincronización se para. Cada 3 h
  es un ritmo prudente; cada hora multiplica el riesgo sin ganar gran cosa.
- **Enlaces que se rompen solos.** Las imágenes las sigue sirviendo el CDN de origen.
  Si allí borran, mueven o protegen una carpeta, los capítulos ya publicados aquí dejan
  de verse aunque la fila siga en tu base de datos. La pestaña **Verificar Caps** sirve
  para detectarlo.
- **Coste ajeno y quejas.** El ancho de banda lo pagan ellos, y automatizarlo aumenta
  el volumen. Es el motivo habitual por el que estos sitios acaban activando protección
  de hotlink (como ya hace `cdn.arenascan.com`, que aquí pasa por `/api/image-proxy`) o
  reclamando por la vía formal.

Nada de esto es un problema técnico que se pueda arreglar con código; es el contexto en
el que va a operar.
