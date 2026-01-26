FASE 1: Correcciones Críticas (Prioridad Alta) ✅ COMPLETADA
1.1 Estructura HTML ✅
✅ Cambiar lang="en" a lang="es"
✅ Unificar rutas (eliminar /Pagina-Manga/)
✅ Corregir estructura semántica (sacar <h2> de dentro de <a>)
✅ Agregar meta tags esenciales (description, keywords, author)
✅ Corregir enlace GSAP (de <link> a <script>)
✅ Agregar atributos alt descriptivos a todas las imágenes
✅ Agregar loading="lazy" a imágenes para mejor rendimiento
✅ Cerrar tags correctamente

1.2 Sistema de Navegación ✅
✅ Crear componente de navegación reutilizable (nav.js)
✅ Implementar navegación sticky mejorada
✅ Agregar breadcrumbs en páginas de capítulos
✅ Mejorar accesibilidad (ARIA labels, navegación por teclado)
✅ Indicadores de foco visibles

1.3 SEO Básico ✅
✅ Agregar meta descriptions únicas por página
✅ Implementar Open Graph tags (Facebook/Twitter)
✅ Crear sitemap.xml
✅ Crear robots.txt
✅ Implementar Schema.org markup para contenido (WebSite, CollectionPage, ComicSeries, BreadcrumbList)

NOTAS DE IMPLEMENTACIÓN FASE 1:
- Se creó el componente nav.js reutilizable con lista de 69 mangas
- Se implementó navegación sticky con position: sticky y sombra
- Se agregaron breadcrumbs estructurados con Schema.org en páginas de capítulos

FASE 1.5: Sistema de Plantillas Dinámicas ✅ COMPLETADA
1.5.1 Sistema de Plantillas (NUEVO - IMPLEMENTADO)
✅ Crear /data/mangas.json con metadata de 69 mangas
✅ Crear /data/chapters.json con información de capítulos
✅ Crear manga.html como plantilla única para todos los mangas
✅ Crear chapter.html como plantilla única para todos los capítulos
✅ Crear /Styles/manga-renderer.js para renderizado dinámico
✅ Crear /Styles/chapter-renderer.js para renderizado dinámico
✅ Crear extract-data.py para extraer datos de HTML existentes a JSON

1.5.2 Limpieza y Actualización
✅ Eliminar carpeta /Capitulos/ con archivos HTML obsoletos (URLs de imágenes ya no existen)
✅ Actualizar sitemap.xml con nuevas URLs de plantillas dinámicas
✅ Sincronizar mangaList en nav.js con todos los 69 mangas
✅ Actualizar Mangas.html con meta tags SEO completos
✅ Actualizar Nuevos.html con meta tags SEO completos

1.5.3 Archivos Pendientes de Limpiar
⚠️ 14 archivos HTML vacíos en /Mangas/ - Pueden eliminarse ya que el sistema de plantillas funciona
   (El Mundo Después del Fin.html, Estandar de la Reencarnacion.html, Heroe Suicida de Clase SSS.html,
    Juujika no Rokunin.html, Kaiju No.8.html, La Magia de un Retornado Debe Ser Especial.html,
    La Torre Tutorial del Jugador Avanzado.html, La Vida Despues de la Muerte.html,
    Mi Hija es el Jefe Final.html, Tensei Shitara Dai Nana Oji Dattanode.html,
    Tensei Shitara Slime Datta Ken.html, Tomodachi Game.html, Tu talento ahora es mio.html, ZomGan.html)

NUEVO SISTEMA DE URLs:
- Mangas: /manga.html?id=MANGA_ID (ej: /manga.html?id=nano-machine)
- Capítulos: /chapter.html?manga=MANGA_ID&cap=NUMERO (ej: /chapter.html?manga=nano-machine&cap=1)
- Los archivos HTML antiguos en /Mangas/ aún funcionan pero son redundantes

PRE-REQUISITOS PARA FASE 2: ✅ COMPLETADOS
✅ Sistema de plantillas dinámicas funcionando
✅ sitemap.xml completo con nuevas URLs
✅ Navegación consistente en todas las páginas
✅ mangaList sincronizado con catálogo completo (69 mangas)

FASE 2: Refactorización CSS (Prioridad Alta) ✅ COMPLETADA
2.0 Pre-requisitos (NUEVO)
✅ Verificar que TODOS los archivos HTML estén corregidos
✅ Crear backup del CSS actual antes de modificar (Style.backup.css)
✅ Documentar clases CSS actuales en uso

2.1 Arquitectura CSS ✅
✅ Implementar metodología CSS modular
✅ Crear variables CSS para:
  Colores:
    --color-primary: #ff0000 (rojo actual)
    --color-bg: #000000
    --color-nav: #1B2631
    --color-text: #ffffff
  Espaciados:
    --spacing-xs: 4px
    --spacing-sm: 8px
    --spacing-md: 16px
    --spacing-lg: 24px
    --spacing-xl: 32px
  Fuentes:
    --font-primary: 'Dosis', sans-serif
    --font-secondary: 'Coming Soon', cursive
  Bordes y sombras:
    --border-radius: 10px
    --shadow-sm: 0 2px 4px rgba(0,0,0,0.1)
    --shadow-md: 0 4px 8px rgba(0,0,0,0.2)

✅ Reorganizar en archivos modulares:
  /Styles/
    ✅ base.css (reset, variables CSS)
    ✅ layout.css (grid, contenedores, navegación)
    ✅ components.css (botones, cards, breadcrumbs)
    ✅ utilities.css (helpers, clases de utilidad)
    ✅ theme.css (sistema unificado de temas oscuro/claro)

2.2 Diseño Responsive (Mobile-First) ✅
✅ Implementar mobile-first approach (diseñar para móvil primero)
✅ Crear breakpoints consistentes:
  --breakpoint-sm: 576px (móviles grandes)
  --breakpoint-md: 768px (tablets)
  --breakpoint-lg: 992px (desktop pequeño)
  --breakpoint-xl: 1200px (desktop grande)

✅ Mejoras responsive:
  ✅ Convertir position absolute a flexbox/grid donde sea apropiado
  ✅ Implementar navegación hamburger para móvil
  ✅ Optimizar galería para touch devices
  ✅ Hacer que las tarjetas de manga se adapten al tamaño de pantalla
  ✅ Mejorar espaciado y tipografía en móvil

2.3 Mejoras Visuales y Temas ✅
✅ Mejorar contraste de colores (cumplir WCAG AA mínimo 4.5:1)
✅ Implementar tema oscuro/claro con:
  ✅ Toggle switch flotante (theme-toggle.js)
  ✅ Guardar preferencia en localStorage
  ✅ CSS variables para facilitar cambio de tema
  ✅ Transición suave entre temas (0.3s)
  ✅ Respeta preferencia del sistema (prefers-color-scheme)
✅ Añadir transiciones suaves a elementos interactivos
✅ Optimizar animaciones (reducir uso excesivo, respetar prefers-reduced-motion)
✅ Mejorar efectos hover con transformaciones sutiles

NOTAS DE IMPLEMENTACIÓN FASE 2:
- Backup creado: Style.backup.css
- Archivos CSS creados: base.css, layout.css, components.css, utilities.css, theme.css
- JavaScript creado: theme-toggle.js (toggle flotante con localStorage)
- Style.css ahora importa los módulos CSS
- Todas las páginas HTML actualizadas con theme-toggle.js
- Sistema de temas: oscuro (default) y claro con data-theme attribute

FASE 3: Refactorización JavaScript (Prioridad Media) ✅ COMPLETADA
3.0 Pre-requisitos ✅
✅ Usar /data/mangas.json con metadata de todos los mangas (ya existía de Fase 1.5)
✅ Usar /data/chapters.json con información de capítulos (ya existía de Fase 1.5)
✅ Esto permite: búsqueda completa, filtrado dinámico, gestión de estado

3.1 Modernización y Estructura ✅
✅ Convertir código a ES6+ moderno:
  ✅ const/let en lugar de var
  ✅ Arrow functions
  ✅ Template literals para HTML
  ✅ Destructuring
  ✅ Optional chaining (?.)
  ✅ Nullish coalescing (??)

✅ Modularizar código en /js/:
    /modules/
      ✅ search.js (búsqueda con debounce y fuzzy search)
      ✅ filter.js (filtrado y ordenamiento)
      ✅ navigation.js (navegación y componentes)
      ✅ theme.js (tema oscuro/claro modularizado)
      ✅ storage.js (gestión de localStorage)
    ✅ main.js (punto de entrada principal)
    ✅ config.js (configuración global y estado)

✅ Implementar:
  ✅ async/await para operaciones asíncronas
  ✅ Error handling con try/catch
  ✅ Event delegation para mejor performance
  ✅ Sistema de eventos personalizados (grandiel:*)

3.2 Sistema de Búsqueda Dinámico Real ✅
✅ Búsqueda carga datos desde mangas.json
✅ Búsqueda con debounce (300ms configurable)
✅ Búsqueda fuzzy con algoritmo de Levenshtein
✅ Resaltado de resultados con <mark>
✅ Filtros avanzados:
    ✅ Por género
    ✅ Por estado (en emisión, completado)
    ✅ Por tipo (Manhwa, Manga, Manhua)
✅ Ordenamiento dinámico:
    ✅ A-Z, Z-A
    ✅ Más reciente / Más capítulos
✅ Paginación de resultados con UI

3.3 Gestión de Estado y Persistencia ✅
✅ Sistema de estado simple (AppState en config.js):
  ✅ Estado global para filtros, tema, mangas, favoritos, historial

✅ localStorage con APIs especializadas:
  ✅ ThemeStorage - Preferencia de tema
  ✅ FavoritesStorage - Mangas favoritos
  ✅ HistoryStorage - Historial de lectura
  ✅ SearchHistoryStorage - Historial de búsqueda
  ✅ PreferencesStorage - Preferencias de usuario
  ✅ FiltersStorage - Filtros guardados

✅ Sincronizar estado entre páginas:
  ✅ Eventos de storage para sync entre pestañas
  ✅ Eventos personalizados (grandiel:*)

NOTAS DE IMPLEMENTACIÓN FASE 3:
- Creada nueva carpeta /js/ con estructura modular ES6
- config.js: CONFIG (constantes), EVENTS (eventos), AppState (estado global)
- storage.js: API unificada para localStorage con manejo de errores y sync
- search.js: debounce, normalización, Levenshtein distance, fuzzy search
- filter.js: filtrado género/tipo/estado, ordenamiento, paginación
- navigation.js: breadcrumbs, navegación de capítulos, historial
- theme.js: modernización de theme-toggle.js como módulo ES6
- main.js: coordinación de módulos e inicialización de la app
- Nuevos estilos CSS agregados a components.css
- Scripts legacy mantenidos para compatibilidad
- Archivos HTML actualizados para cargar main.js como módulo ES6

PRE-REQUISITOS PARA FASE 4: ✅ COMPLETADOS
✅ Sistema de módulos JavaScript funcionando
✅ Búsqueda dinámica desde JSON
✅ Gestión de estado y localStorage
✅ Estilos CSS para nuevos componentes

FASE 4: Optimización de Performance (Prioridad Alta) ✅ COMPLETADA
4.1 Imágenes ✅
⚠️ PENDIENTE: Eliminar hotlinking de imágenes externas
  Actualmente: Imágenes hotlinkeadas desde olympusscans.com
  Solución: Descargar y hospedar localmente

Optimización de imágenes:
  ✅ Implementar lazy loading nativo: loading="lazy" (YA IMPLEMENTADO)
  ✅ Script de optimización creado: /scripts/optimize-images.js
    - Convierte a WebP para navegadores modernos
    - Crea múltiples tamaños (thumbnail, medium, large)
    - Comprime con Sharp (Node.js)
    - Ejecutar con: npm run optimize-images

4.2 Assets y Build ✅
✅ Implementar bundler moderno:
  ✅ Vite configurado (package.json, vite.config.js)
  ✅ Scripts de desarrollo y build

✅ Tareas del bundler configuradas:
  ✅ Minificar CSS y JS con Terser
  ✅ Tree shaking (eliminar código no usado)
  ✅ Code splitting automático (manualChunks)
  ✅ Optimización de imports
  ✅ Source maps para debugging

✅ Caché de navegador:
  ✅ Versionado de assets (hash en nombre de archivo)
  ✅ Service Worker para caché offline (sw.js)

4.3 Carga y Rendimiento ✅
✅ Optimizar carga inicial:
  ✅ Critical CSS inline en <head>
  ✅ Defer scripts no críticos
  ✅ Preload recursos críticos (Style.css, logo.gif)
  ✅ Preconnect a dominios externos (fonts, CDN)
  ✅ DNS-prefetch para resolución anticipada

✅ Code splitting configurado en Vite:
  ✅ vendor: gsap
  ✅ app-core: config, storage, theme
  ✅ app-features: search, filter, navigation

✅ Service Worker para PWA (sw.js):
  ✅ Caché de assets estáticos (Cache First)
  ✅ Caché de API responses (Network First)
  ✅ Modo offline básico (Stale While Revalidate)
  ✅ Estrategias de caché configurables

✅ PWA Completo:
  ✅ manifest.json con iconos, shortcuts, screenshots
  ✅ PWA Manager (js/pwa.js) para registro y gestión
  ✅ Banner de conectividad (online/offline)
  ✅ Notificación de actualizaciones
  ✅ Botón de instalación personalizado
  ✅ Estilos PWA (Styles/pwa.css)

NOTAS DE IMPLEMENTACIÓN FASE 4:
- package.json: Configuración NPM con Vite, Sharp, Terser
- vite.config.js: Build config con code splitting y optimización
- manifest.json: PWA manifest completo
- sw.js: Service Worker con estrategias Cache First, Network First, Stale While Revalidate
- js/pwa.js: Gestión de PWA (instalación, actualizaciones, conectividad)
- Styles/pwa.css: Estilos para componentes PWA
- Styles/critical.css: CSS crítico para inline
- scripts/optimize-images.js: Optimización de imágenes con Sharp
- HTML actualizado: meta tags PWA, preload, preconnect, manifest link

COMANDOS DISPONIBLES:
  npm install        - Instalar dependencias
  npm run dev        - Servidor de desarrollo (localhost:3000)
  npm run build      - Build de producción
  npm run preview    - Preview del build
  npm run optimize-images - Optimizar imágenes

Métricas objetivo:
  - First Contentful Paint (FCP): < 1.8s
  - Largest Contentful Paint (LCP): < 2.5s
  - Time to Interactive (TTI): < 3.8s
  - Cumulative Layout Shift (CLS): < 0.1

PRE-REQUISITOS PARA FASE 5: ✅ COMPLETADOS (2026-01-25)
✅ PWA configurada y funcionando
✅ Service Worker con cache offline
✅ Optimizaciones de rendimiento aplicadas
✅ Build system moderno (Vite)
✅ Problemas de Fases 1-4 corregidos (ver seccion VERIFICACION)

═══════════════════════════════════════════════════════════════════════════════
VERIFICACIÓN DE FASES 1-4 (Análisis 2026-01-25)
═══════════════════════════════════════════════════════════════════════════════

RESUMEN DE VERIFICACION (Actualizado 2026-01-25):
├── FASE 1: ✅ CORRECTAMENTE IMPLEMENTADA
├── FASE 1.5: ✅ COMPLETADA (datos corregidos, archivos legacy eliminados)
├── FASE 2: ✅ CORRECTAMENTE IMPLEMENTADA
├── FASE 3: ✅ CORRECTAMENTE IMPLEMENTADA (modulos ES6 en plantillas)
└── FASE 4: ✅ COMPLETADA (manifest corregido, sitemap actualizado)

───────────────────────────────────────────────────────────────────────────────
PROBLEMAS CRITICOS - RESUELTOS (2026-01-25)
───────────────────────────────────────────────────────────────────────────────

✅ PROBLEMA 1: mangas.json tiene datos incompletos - RESUELTO
   Ubicación: /data/mangas.json
   Descripción:
   - TODOS los mangas tienen `genres: []` (array vacío)
   - TODOS usan `image: "/img/logo.gif"` en lugar de portadas reales
   - Descripciones son genéricas: "Lee X en español en Grandiel Scan"
   - Campo `type` incorrecto para algunos (Blue Lock, Chainsaw Man son Manga japonés, no Manhwa)

   Solución requerida:
   □ Completar array `genres` para cada manga con géneros correctos
   □ Actualizar campo `image` con ruta a portada real de cada manga
   □ Escribir descripciones únicas y detalladas
   □ Corregir campo `type` (Manga/Manhwa/Manhua)
   □ Agregar campos faltantes: author, artist, year, alternativeNames

🔴 PROBLEMA 2: Inconsistencia de URLs entre sistemas
   Ubicación: /Styles/nav.js, /Mangas/*.html, sitemap.xml
   Descripción:
   - nav.js usa rutas legacy: /Mangas/Nano machine.html
   - Sistema nuevo usa: /manga.html?id=nano-machine
   - Esto causa que la búsqueda redirija a archivos legacy

   Solución requerida:
   □ Actualizar mangaList en nav.js para usar URLs del sistema nuevo:
     { title: "Nano Machine", url: "/manga.html?id=nano-machine" }
   □ Eliminar referencias a /Mangas/*.html del sitemap.xml

🔴 PROBLEMA 3: Archivos HTML legacy pendientes de eliminar
   Ubicación: /Mangas/*.html (69 archivos)
   Descripción:
   - 14 archivos están vacíos (solo 1 línea)
   - Los demás 55 archivos apuntan a /Capitulos/ que fue eliminado
   - Estos archivos son redundantes con el sistema de plantillas

   Archivos vacíos confirmados:
   - El Mundo Después del Fin.html
   - Estandar de la Reencarnacion.html
   - Heroe Suicida de Clase SSS.html
   - Juujika no Rokunin.html
   - Kaiju No.8.html
   - La Magia de un Retornado Debe Ser Especial.html
   - La Torre Tutorial del Jugador Avanzado.html
   - La Vida Despues de la Muerte.html
   - Mi Hija es el Jefe Final.html
   - Tensei Shitara Dai Nana Oji Dattanode...html
   - Tensei Shitara Slime Datta Ken.html
   - Tomodachi Game.html
   - Tu talento ahora es mio.html
   - ZomGan.html

   Solución requerida:
   □ Eliminar todos los archivos en /Mangas/ (69 archivos)
   □ Verificar que no hay enlaces externos apuntando a estas URLs
   □ Configurar redirects 301 si es necesario (para SEO)

🟡 PROBLEMA 4: Plantillas no usan módulos ES6
   Ubicación: /manga.html, /chapter.html
   Descripción:
   - manga.html carga: manga-renderer.js, nav.js, busqueda.js, theme-toggle.js
   - chapter.html carga: chapter-renderer.js, nav.js, theme-toggle.js
   - Ninguna carga el nuevo sistema modular: /js/main.js
   - No aprovechan búsqueda avanzada, filtros, favoritos, historial

   Solución requerida:
   □ Agregar <script type="module" src="/js/main.js"></script> a ambas plantillas
   □ Agregar <script type="module" src="/js/pwa.js"></script> para PWA
   □ Agregar meta tags PWA faltantes (theme-color, manifest, etc.)

🟡 PROBLEMA 5: Assets de PWA faltantes
   Ubicación: /img/screenshots/, /img/icons/
   Descripción:
   - manifest.json referencia screenshots que NO EXISTEN:
     /img/screenshots/home.png
     /img/screenshots/manga-list.png
   - manifest.json referencia iconos de shortcuts que NO EXISTEN:
     /img/icons/manga-icon.png
     /img/icons/update-icon.png
     /img/icons/new-icon.png

   Solución requerida:
   □ Crear carpeta /img/screenshots/
   □ Crear screenshot home.png (1280x720)
   □ Crear screenshot manga-list.png (1280x720)
   □ Crear iconos de shortcuts (96x96):
     - manga-icon.png
     - update-icon.png
     - new-icon.png
   □ O eliminar referencias de manifest.json si no se usarán

🟡 PROBLEMA 6: Archivos legacy de capítulos con URLs rotas
   Ubicación: /Mangas/*.html (archivos con contenido)
   Descripción:
   - Archivos como Nano machine.html tienen enlaces a /Capitulos/nano machine cap 1.html
   - La carpeta /Capitulos/ fue eliminada según el plan
   - Usuarios que lleguen a estas páginas legacy verán enlaces rotos

   Solución requerida:
   □ Si se mantienen archivos legacy, actualizar enlaces a usar /chapter.html?manga=X&cap=Y
   □ Mejor solución: Eliminar archivos legacy y usar solo plantillas dinámicas

───────────────────────────────────────────────────────────────────────────────
ERRORES POTENCIALES Y RIESGOS
───────────────────────────────────────────────────────────────────────────────

⚠️ RIESGO 1: Hotlinking de imágenes de capítulos
   Ubicación: /data/chapters.json
   Descripción:
   - Todas las imágenes de capítulos usan URLs de olympusscans.com
   - Si olympusscans cambia sus URLs o bloquea hotlinking, el sitio se rompe
   - Ejemplo: https://dashboard.olympusscans.com/storage/comics/...

   Impacto: ALTO - Funcionalidad core afectada
   Solución: Descargar y hospedar imágenes localmente (requiere almacenamiento)

⚠️ RIESGO 2: SEO - URLs duplicadas
   Descripción:
   - Mismo contenido accesible desde múltiples URLs:
     /Mangas/Nano machine.html
     /manga.html?id=nano-machine
   - Google puede penalizar por contenido duplicado

   Solución: Eliminar archivos legacy o implementar canonical tags

⚠️ RIESGO 3: Service Worker puede cachear datos desactualizados
   Descripción:
   - SW usa Cache First para assets estáticos
   - Si se actualiza mangas.json, usuarios pueden ver versión antigua
   - TTL de caché en config.js es 5 minutos, pero SW puede servir más tiempo

   Solución: Incrementar versión de SW (CACHE_VERSION) al hacer cambios importantes

⚠️ RIESGO 4: Módulos ES6 no soportados en navegadores antiguos
   Descripción:
   - type="module" no funciona en IE11 ni navegadores muy antiguos
   - Puede afectar a un pequeño porcentaje de usuarios

   Mitigación actual: Scripts legacy se mantienen como fallback

───────────────────────────────────────────────────────────────────────────────
TAREAS PENDIENTES ANTES DE FASE 5 - COMPLETADAS (2026-01-25)
───────────────────────────────────────────────────────────────────────────────

PRIORIDAD ALTA (Bloquean funcionamiento correcto):
✅ [DATOS] Completar mangas.json con generos, portadas e info correcta
   - Generos agregados a todos los 69 mangas
   - Imagenes actualizadas con las portadas existentes
   - Tipos corregidos (Manga, Manhwa, Manhua)
   - Descripciones mejoradas
✅ [URLS] Actualizar nav.js para usar sistema de plantillas dinamicas
   - Todas las URLs cambiadas de /Mangas/*.html a /manga.html?id=*
✅ [LIMPIEZA] Eliminar archivos de /Mangas/ (69 archivos)
   - Carpeta /Mangas/ eliminada completamente

PRIORIDAD MEDIA (Mejoran experiencia):
✅ [PLANTILLAS] Agregar modulos ES6 a manga.html y chapter.html
   - Scripts main.js y pwa.js agregados como modulos ES6
   - Meta tags PWA agregados (theme-color, manifest, apple-touch-icon)
✅ [PWA] Corregir manifest.json
   - Screenshots inexistentes eliminados
   - Iconos de shortcuts inexistentes eliminados (shortcuts sin iconos funcionan)
✅ [LIMPIEZA] Archivos legacy de /Mangas/ eliminados

PRIORIDAD BAJA (Optimizaciones):
✅ [SEO] Actualizar sitemap.xml eliminando URLs legacy
   - URLs de /Mangas/*.html eliminadas
   - Solo URLs de plantillas dinamicas
□ [PERF] Configurar headers de cache en servidor (requiere configuracion del servidor)
□ [DOCS] Documentar sistema de plantillas dinamicas para mantenimiento

───────────────────────────────────────────────────────────────────────────────
ARCHIVOS MODIFICADOS (2026-01-25)
───────────────────────────────────────────────────────────────────────────────

1. /data/mangas.json ✅
   - Generos agregados a todos los mangas
   - Imagenes actualizadas con portadas reales
   - Tipos corregidos (Manga/Manhwa/Manhua)
   - Descripciones mejoradas

2. /Styles/nav.js ✅
   - URLs cambiadas a /manga.html?id=*

3. /manga.html ✅
   - Modulos ES6 agregados
   - Meta tags PWA agregados

4. /chapter.html ✅
   - Modulos ES6 agregados
   - Meta tags PWA agregados

5. /sitemap.xml ✅
   - URLs legacy eliminadas

6. /manifest.json ✅
   - Screenshots y iconos inexistentes eliminados

7. /Mangas/ (carpeta) ✅
   - Eliminada completamente (69 archivos HTML)

═══════════════════════════════════════════════════════════════════════════════

FASE 5: Accesibilidad (Prioridad Media) ✅ COMPLETADA
5.1 ARIA y Semántica ✅
✅ Agregar roles ARIA apropiados
✅ Implementar landmarks (<main>, <nav>, <aside>)
✅ Labels para todos los controles interactivos
✅ Focus visible en todos los elementos interactivos
✅ Soporte para prefers-reduced-motion
✅ Soporte para prefers-contrast: high

5.2 Navegación ✅
✅ Skip to main content link (todas las páginas)
✅ Navegación completa por teclado
✅ Indicadores de foco visibles mejorados (3px, con sombra)
✅ Orden lógico de tabulación
✅ aria-current="page" para página activa

5.3 Contenido ✅
✅ Contraste mínimo WCAG AA (4.5:1)
✅ Tamaños de texto escalables (CSS variables)
✅ Targets táctiles mínimos 44x44px (botones, enlaces, controles)
✅ Clase .visually-hidden para contenido solo para screen readers
✅ Clase .sr-only para accesibilidad

NOTAS DE IMPLEMENTACIÓN FASE 5:
- Skip-to-main link agregado a: index.html, Mangas.html, Actualizaciones.html, Nuevos.html, manga.html, chapter.html
- CSS mejorado en base.css: focus-visible con sombra, prefers-reduced-motion, prefers-contrast
- CSS mejorado en components.css: .skip-to-main, .visually-hidden, focus states para todos los componentes
- CSS mejorado en layout.css: touch targets 44x44px en navegación y búsqueda
- Todos los botones, enlaces y controles interactivos tienen min-width/min-height de 44px
- PWA meta tags agregados a Actualizaciones.html y Nuevos.html
- Módulos ES6 agregados a todas las páginas

═══════════════════════════════════════════════════════════════════════════════
CORRECCIÓN DE ERRORES (2026-01-26)
═══════════════════════════════════════════════════════════════════════════════

BUGS CORREGIDOS EN SCRIPTS LEGACY:

1. busqueda.js ✅
   - Variables globales sin declarar → Convertidas a const con IIFE
   - Sin null checks → Agregados null checks para todos los elementos DOM
   - Event listeners duplicados → Envueltos en IIFE para evitar duplicación

2. Stylejava.js ✅
   - Callback incorrecto en DOMContentLoaded (ejecutaba inmediatamente) → Corregido con arrow function
   - Sin null checks para progressBar y elementos DOM → Agregados
   - Variables con var → Convertidas a const/let
   - Funciones no globales → Expuestas en window para compatibilidad

3. gene.js ✅
   - Sin null checks antes de addEventListener → Agregados
   - Magic numbers sin contexto → Convertidos a constantes nombradas

4. Filtro.js ✅
   - Sin null checks → Agregados para todos los selectores
   - Variables sin declarar → Convertidas a const/let
   - Código envuelto en DOMContentLoaded con 'use strict'

5. filter.js (ES6 module) ✅
   - Import no usado de Search → Eliminado (comentado para referencia)

6. chapter-renderer.js ✅
   - showError() sin null checks → Agregados para todos los elementos
   - localStorage sin verificación de disponibilidad → Agregada función isLocalStorageAvailable()

7. manga-renderer.js ✅
   - showError() sin null checks → Agregados para todos los elementos

8. Mangas.html ✅
   - onclick inline en imagen de ordenamiento → Convertido a button con event listener
   - Mejor accesibilidad con aria-label

9. Actualizaciones.html ✅
   - onclick inline en botones de ordenamiento → Convertidos a buttons con event listeners
   - Agregados aria-labels

10. chapter.html ✅
    - Clase FA deprecada "fa fa-search" → Cambiada a "fas fa-search"

MEJORAS DE CÓDIGO:
- Todos los scripts legacy ahora usan 'use strict'
- Todos los scripts legacy envueltos en IIFE para evitar contaminación global
- Variables declaradas con const/let en lugar de var
- Null checks en todas las operaciones DOM
- Event listeners en JavaScript en lugar de onclick inline
- Mejor manejo de errores con try/catch donde es necesario

FASE 6: Funcionalidades Nuevas (Prioridad Baja)
6.1 Sistema de Usuarios
Registro/Login
Favoritos
Historial de lectura
Modo lectura continua

6.2 Características Avanzadas
Sistema de comentarios
Notificaciones de nuevos capítulos
Modo lector mejorado
Descarga de capítulos

6.3 PWA
Manifest.json
Service Worker
Modo offline
Instalable en dispositivos

FASE 7: Backend y Base de Datos (Prioridad Media-Baja)
7.1 Infraestructura
Migrar a sistema dinámico (Node.js + Express, o similar)
Base de datos (PostgreSQL/MongoDB)
API RESTful
Sistema de gestión de contenido (CMS)

7.2 Automatización
Sistema de scraping/actualización automática
Generación automática de páginas
Backup automático
Deploy automatizado
