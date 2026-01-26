# Grandiel Scan - Sitio Web de Manhwas

Sitio web para leer manhwas y mangas en español.

## 🚀 Inicio Rápido

### Opción 1: Doble Clic (Windows)

1. Haz doble clic en `iniciar-servidor.bat`
2. El navegador se abrirá automáticamente en `http://localhost:8000`
3. Presiona `Ctrl+C` en la terminal para detener el servidor

### Opción 2: Línea de Comandos

```bash
# Con Python (recomendado)
python server.py

# O con Python 3 explícitamente
python3 server.py

# Servidor HTTP simple de Python (alternativa básica)
python -m http.server 8000
```

Luego abre tu navegador en: `http://localhost:8000`

## 📁 Estructura del Proyecto

```
Grandiel-Scan-main/
├── index.html              # Página principal
├── Actualizaciones.html    # Página de actualizaciones
├── Mangas.html            # Listado de mangas
├── Nuevos.html            # Mangas nuevos
├── Mangas/                # Páginas individuales de mangas
│   ├── Nano machine.html
│   ├── maldita reencarnacion.html
│   └── ...
├── Capitulos/             # Páginas de capítulos
│   ├── nano machine cap 1.html
│   └── ...
├── Styles/                # CSS y JavaScript
│   ├── Style.css
│   ├── busqueda.js
│   ├── Stylejava.js
│   └── nav.js
├── img/                   # Imágenes
├── iconos/                # Iconos
├── Plan.md                # Plan de mejoras
├── server.py              # Servidor de desarrollo
├── iniciar-servidor.bat   # Script de inicio rápido
└── fix-html.py            # Script de correcciones masivas
```

## 🛠️ Herramientas de Desarrollo

### Script de Correcciones Masivas

Aplica correcciones automáticas a todos los archivos HTML:

```bash
python fix-html.py
```

Este script:
- Cambia `lang="en"` a `lang="es"`
- Elimina rutas `/Pagina-Manga/`
- Corrige enlaces de GSAP
- Mejora estructura semántica
- Agrega ARIA labels
- Actualiza atributos alt en imágenes
- Agrega lazy loading
- Actualiza año de copyright

### Servidor de Desarrollo

El servidor personalizado (`server.py`):
- Sirve archivos en `http://localhost:8000`
- Abre el navegador automáticamente
- Redirige `/` a `/index.html`
- Maneja `/Inicio.html` correctamente
- No cachea archivos durante desarrollo

## ✅ Mejoras Implementadas (Fase 1)

### 1.1 Estructura HTML
- ✅ Idioma cambiado a español (`lang="es"`)
- ✅ Rutas unificadas (eliminado `/Pagina-Manga/`)
- ✅ Estructura semántica corregida (`<h2>` y `<h3>` fuera de `<a>`)
- ✅ Meta tags esenciales agregados (description, keywords, author)
- ✅ GSAP corregido (de `<link>` a `<script>`)
- ✅ Atributos `alt` descriptivos
- ✅ Lazy loading implementado

### 1.2 Sistema de Navegación
- ✅ Componente de navegación reutilizable (`nav.js`)
- ✅ Navegación sticky mejorada
- ✅ Breadcrumbs en páginas de capítulos
- ✅ Mejoras de accesibilidad (ARIA labels, navegación por teclado)

### 1.3 SEO Básico
- ✅ Meta descriptions únicas por página
- ✅ Open Graph tags (Facebook/Twitter)
- ✅ Sitemap.xml
- ✅ Robots.txt
- ✅ Schema.org markup (WebSite, CollectionPage, ComicSeries, BreadcrumbList)

## 📋 Próximos Pasos

Ver [Plan.md](Plan.md) para el plan completo de mejoras.

### Fase 2: Refactorización CSS
- Implementar variables CSS
- Diseño responsive mobile-first
- Tema oscuro/claro
- Mejoras visuales

### Fase 3: JavaScript Moderno
- Modularizar código
- Sistema de búsqueda dinámico real
- Gestión de estado con localStorage

### Fase 4: Optimización de Performance
- Hospedar imágenes localmente (eliminar hotlinking)
- Implementar WebP
- Minificación y bundling
- Service Worker para PWA

## 🔧 Requisitos

- Python 3.6 o superior
- Navegador web moderno (Chrome, Firefox, Edge, Safari)

## 📝 Notas

- El servidor de desarrollo es solo para uso local
- No usar en producción sin configuración adicional
- Las imágenes están actualmente hotlinkeadas desde dominios externos
- Se recomienda descargar y hospedar las imágenes localmente

## 🤝 Contribuciones

Para contribuir al proyecto:

1. Revisa [Plan.md](Plan.md) para ver tareas pendientes
2. Ejecuta `fix-html.py` después de hacer cambios masivos
3. Prueba localmente con `server.py`
4. Valida HTML con [W3C Validator](https://validator.w3.org/)

## 📄 Licencia

© 2026 Grandiel Scan

---

**Versión:** Fase 1 Completada
**Última actualización:** 2026-01-24
