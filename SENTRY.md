# Sentry + Vercel — puesta en marcha

Todo el código ya está en el repositorio. Lo único que falta es conectar la cuenta
y poner las variables de entorno en Vercel.

---

## 1. Conectar Sentry desde Vercel

1. Vercel → tu proyecto → pestaña **Integrations** → **Browse Marketplace**.
2. Busca **Sentry** → **Install** / **Connect**.
3. Elige la cuenta de Vercel, y luego **solo el proyecto `grandiel-scan`**
   (no "All Projects", así el token no toca otros proyectos).
4. En Sentry, selecciona la organización y el proyecto. Si aún no existe, créalo
   con plataforma **Next.js**.

Al terminar, la integración escribe varias variables de entorno en el proyecto de
Vercel. **No des por hecho cuáles**: pasa al paso 2 y compruébalas.

---

## 2. Comprobar las variables en Vercel

Vercel → proyecto → **Settings → Environment Variables**. Deben existir estas
cinco, en los entornos *Production* y *Preview*:

| Variable | Para qué sirve | Si falta |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Envío de errores **desde el navegador** | Añádela a mano (ver abajo) |
| `SENTRY_DSN` | Envío desde servidor / edge / middleware | Puede omitirse: el código cae a `NEXT_PUBLIC_SENTRY_DSN` |
| `SENTRY_ORG` | Subida de source maps en el build | Añádela a mano |
| `SENTRY_PROJECT` | Subida de source maps en el build | Añádela a mano |
| `SENTRY_AUTH_TOKEN` | Subida de source maps en el build | Añádela a mano |

**La más importante es `NEXT_PUBLIC_SENTRY_DSN`.** La integración de Vercel suele
inyectar solo `SENTRY_DSN`, y esa variable no llega al navegador: sin el prefijo
`NEXT_PUBLIC_` los errores de cliente (el 90 % de lo que se ve en un lector de
manhwas) no se reportan.

- **Dónde está el DSN:** Sentry → **Settings → Projects → grandiel-scan →
  Client Keys (DSN)**. Es una URL tipo `https://<clave>@o123456.ingest.sentry.io/7654321`.
- El DSN es público por diseño (va en el bundle del navegador); no es un secreto.

**Dónde está el auth token** (solo si tienes que crearlo a mano): Sentry →
**Settings → Auth Tokens → Create New Token**, con los permisos
`project:releases` y `org:read`.

Tras tocar variables hay que **redesplegar**: Vercel → Deployments → menú `…` del
último deploy → **Redeploy**. Las variables de entorno se leen en tiempo de build.

---

## 3. Comprobar que funciona

1. Despliega y abre la web en producción.
2. En la consola del navegador, en cualquier página del sitio:
   ```js
   throw new Error('Prueba Sentry — cliente')
   ```
3. En Sentry, **Issues** debe mostrar el error en menos de un minuto, con el
   stack trace apuntando al archivo `.tsx` original (no a código minificado).

Si el stack trace sale minificado, faltan `SENTRY_ORG`, `SENTRY_PROJECT` o
`SENTRY_AUTH_TOKEN` en el build. Se ve en el log del deploy de Vercel.

Para probar el lado servidor, provoca un error en cualquier ruta de `/api/` y
comprueba que aparece en Sentry etiquetado con `environment: production`.

---

## 3.b Resultado de la prueba local (17/08/2026)

Verificado en esta máquina con las variables reales de la integración:

| Comprobación | Resultado |
|---|---|
| `npx tsc --noEmit` (typecheck completo) | ✅ 0 errores |
| `next build` | ✅ compila |
| DSN presente en el bundle del navegador | ✅ |
| Ruta túnel `/monitoring` en `routes-manifest.json` | ✅ |
| `/monitoring` excluido del matcher del middleware | ✅ |
| `instrumentation.js` en el bundle de servidor | ✅ |
| `SENTRY_AUTH_TOKEN` válido (API de Sentry) | ✅ HTTP 200 |
| `SENTRY_ORG` / `SENTRY_PROJECT` correctos | ✅ resuelven a "Grandiel-scan" (`javascript-nextjs`) |
| Subida de source maps | ⚠️ sin verificar en local (ver abajo) |

### Dos avisos sobre las pruebas en local

1. **`next.config.ts` no lee `.env.local`.** El config se evalúa antes que los
   archivos `.env`, así que `SENTRY_ORG`, `SENTRY_PROJECT` y `SENTRY_AUTH_TOKEN`
   llegan como `undefined` y Sentry desactiva los source maps sin avisar.
   En Vercel **no pasa**: allí son variables de entorno reales del proceso.
   Para reproducirlo en local hay que exportarlas antes de construir:
   ```bash
   set -a; source .env.local; set +a
   npm run build
   ```
   Con eso el build sí genera los `.map`.

2. **La subida a Sentry quedó sin confirmar en local** porque esta máquina no
   tiene Node.js y el build se hizo con Deno, donde el hook post-compilación de
   `sentry-cli` no llegó a ejecutarse. La API de Sentry sigue mostrando
   **0 releases**. No es un problema de configuración: las credenciales son
   válidas y los source maps se generan. Se confirma en el primer deploy de
   Vercel, donde el build corre sobre Node: busca `Uploaded ... artifacts` en el
   log del deploy, o mira que aparezca una release en
   Sentry → **Releases**.

---

## 4. Qué hay montado en el código

| Archivo | Función |
|---|---|
| `instrumentation.ts` | Carga las configs de servidor/edge y registra `onRequestError`. **Sin este archivo, los errores de servidor no llegaban a Sentry.** |
| `instrumentation-client.ts` | Config del navegador (sustituye a `sentry.client.config.ts`, obsoleto desde Next 15.3). |
| `sentry.server.config.ts` | Runtime Node: rutas de API, Server Components. |
| `sentry.edge.config.ts` | Runtime Edge: `middleware.ts`. |
| `app/global-error.tsx` | Captura los fallos del propio `RootLayout`, donde `app/error.tsx` ya no puede renderizar. |
| `app/error.tsx`, `app/manga/[id]/error.tsx`, `app/chapter/[mangaId]/[cap]/error.tsx` | Reportan a Sentry además de `console.error`. |
| `next.config.ts` | Source maps, túnel `/monitoring` y monitor del cron. |

### Detalles que conviene conocer

- **Túnel `/monitoring`.** Los eventos del navegador no van a `ingest.sentry.io`;
  salen por `grandielscan.com/monitoring`. Dos razones: la CSP de `middleware.ts`
  solo permite `connect-src 'self'`, y los bloqueadores de anuncios filtran
  `sentry.io`. La ruta está excluida del matcher del middleware.
- **Solo reporta en producción.** En local no se envía nada. Para probarlo en
  desarrollo: `NEXT_PUBLIC_SENTRY_DEBUG=true` (cliente) o `SENTRY_DEBUG=true` (servidor).
- **Cuota.** `tracesSampleRate: 0.1` en producción — se muestrea el 10 % de las
  transacciones de performance. Los **errores se capturan al 100 %**, el muestreo
  solo afecta a las trazas.
- **Sin datos personales.** `sendDefaultPii: false`: no se envían IP ni cookies.
  Importante porque las cookies del sitio llevan la sesión de Supabase.
- **Source maps borrados tras subirlos.** `deleteSourcemapsAfterUpload: true`
  evita que queden servidos en `/_next/static`, donde cualquiera podría leer el
  código original.
- **Cron monitorizado.** `automaticVercelMonitors: true` registra
  `/api/cron/cleanup` (el de `vercel.json`) como Cron Monitor: Sentry avisa
  también cuando el cron **no** se ejecuta.
