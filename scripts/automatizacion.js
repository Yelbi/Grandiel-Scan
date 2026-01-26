/**
 * Script de Automatización para Grandiel Scan
 * Fase 1.5 - Aplicación masiva de correcciones
 *
 * Uso: node scripts/automatizacion.js [comando]
 * Comandos:
 *   scan     - Escanea y reporta estado de archivos
 *   fix      - Aplica correcciones a archivos
 *   sitemap  - Genera sitemap.xml completo
 *   navlist  - Genera lista de mangas para nav.js
 */

const fs = require('fs');
const path = require('path');

// Configuración
const CONFIG = {
    baseDir: path.join(__dirname, '..'),
    mangasDir: path.join(__dirname, '..', 'Mangas'),
    capitulosDir: path.join(__dirname, '..', 'Capitulos'),
    domain: 'https://grandielscan.com'
};

// ============================================
// UTILIDADES
// ============================================

function readFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (e) {
        return null;
    }
}

function writeFile(filePath, content) {
    fs.writeFileSync(filePath, content, 'utf8');
}

function getHtmlFiles(dir) {
    try {
        return fs.readdirSync(dir)
            .filter(f => f.endsWith('.html'))
            .map(f => ({
                name: f,
                path: path.join(dir, f),
                title: f.replace('.html', '')
            }));
    } catch (e) {
        console.error(`Error leyendo directorio ${dir}:`, e.message);
        return [];
    }
}

function extractMangaName(filename) {
    // Extrae el nombre del manga del nombre del archivo
    return filename
        .replace('.html', '')
        .replace(/ cap \d+/i, '')
        .trim();
}

function formatTitle(str) {
    // Capitaliza cada palabra
    return str.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// ============================================
// ANÁLISIS DE ARCHIVOS
// ============================================

function analyzeFile(filePath) {
    const content = readFile(filePath);
    if (!content) {
        return { status: 'error', message: 'No se pudo leer' };
    }

    const lines = content.split('\n').length;

    if (lines <= 5 || content.trim().length < 100) {
        return { status: 'empty', lines, message: 'Archivo vacío o corrupto' };
    }

    const checks = {
        hasLangEs: content.includes('lang="es"'),
        hasMetaDescription: content.includes('meta name="description"'),
        hasOpenGraph: content.includes('og:title'),
        hasSchemaOrg: content.includes('schema.org'),
        hasAriaLabels: content.includes('aria-label'),
        hasLoadingLazy: content.includes('loading="lazy"'),
        hasCorrectLogo: content.includes('href="/index.html"') || content.includes("href='/index.html'"),
        hasNavJs: content.includes('nav.js'),
        hasBreadcrumbs: content.includes('breadcrumb') || content.includes('Breadcrumb')
    };

    const score = Object.values(checks).filter(Boolean).length;
    const total = Object.keys(checks).length;

    return {
        status: score >= 6 ? 'updated' : 'needs_update',
        score: `${score}/${total}`,
        checks,
        lines
    };
}

function scanAllFiles() {
    console.log('\n📊 ESCANEANDO ARCHIVOS...\n');

    const results = {
        mangas: { total: 0, empty: 0, updated: 0, needsUpdate: 0, files: [] },
        capitulos: { total: 0, empty: 0, updated: 0, needsUpdate: 0, files: [] },
        principales: { total: 0, empty: 0, updated: 0, needsUpdate: 0, files: [] }
    };

    // Escanear Mangas
    const mangaFiles = getHtmlFiles(CONFIG.mangasDir);
    results.mangas.total = mangaFiles.length;

    mangaFiles.forEach(file => {
        const analysis = analyzeFile(file.path);
        file.analysis = analysis;
        results.mangas.files.push(file);

        if (analysis.status === 'empty') results.mangas.empty++;
        else if (analysis.status === 'updated') results.mangas.updated++;
        else results.mangas.needsUpdate++;
    });

    // Escanear Capítulos
    const capFiles = getHtmlFiles(CONFIG.capitulosDir);
    results.capitulos.total = capFiles.length;

    capFiles.forEach(file => {
        const analysis = analyzeFile(file.path);
        file.analysis = analysis;
        results.capitulos.files.push(file);

        if (analysis.status === 'empty') results.capitulos.empty++;
        else if (analysis.status === 'updated') results.capitulos.updated++;
        else results.capitulos.needsUpdate++;
    });

    // Escanear páginas principales
    const mainFiles = ['index.html', 'Mangas.html', 'Nuevos.html', 'Actualizaciones.html']
        .map(f => ({ name: f, path: path.join(CONFIG.baseDir, f), title: f.replace('.html', '') }));

    results.principales.total = mainFiles.length;

    mainFiles.forEach(file => {
        if (fs.existsSync(file.path)) {
            const analysis = analyzeFile(file.path);
            file.analysis = analysis;
            results.principales.files.push(file);

            if (analysis.status === 'empty') results.principales.empty++;
            else if (analysis.status === 'updated') results.principales.updated++;
            else results.principales.needsUpdate++;
        }
    });

    return results;
}

function printReport(results) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    REPORTE DE ESTADO                       ');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Mangas
    console.log('📚 MANGAS (/Mangas/)');
    console.log(`   Total: ${results.mangas.total}`);
    console.log(`   ✅ Actualizados: ${results.mangas.updated}`);
    console.log(`   ⚠️  Necesitan actualización: ${results.mangas.needsUpdate}`);
    console.log(`   ❌ Vacíos/Corruptos: ${results.mangas.empty}`);

    if (results.mangas.empty > 0) {
        console.log('\n   Archivos vacíos:');
        results.mangas.files
            .filter(f => f.analysis.status === 'empty')
            .forEach(f => console.log(`   - ${f.name}`));
    }

    // Capítulos
    console.log('\n📖 CAPÍTULOS (/Capitulos/)');
    console.log(`   Total: ${results.capitulos.total}`);
    console.log(`   ✅ Actualizados: ${results.capitulos.updated}`);
    console.log(`   ⚠️  Necesitan actualización: ${results.capitulos.needsUpdate}`);
    console.log(`   ❌ Vacíos/Corruptos: ${results.capitulos.empty}`);

    // Principales
    console.log('\n🏠 PÁGINAS PRINCIPALES');
    console.log(`   Total: ${results.principales.total}`);
    console.log(`   ✅ Actualizados: ${results.principales.updated}`);
    console.log(`   ⚠️  Necesitan actualización: ${results.principales.needsUpdate}`);

    // Resumen
    const totalFiles = results.mangas.total + results.capitulos.total + results.principales.total;
    const totalUpdated = results.mangas.updated + results.capitulos.updated + results.principales.updated;
    const totalEmpty = results.mangas.empty + results.capitulos.empty + results.principales.empty;

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                       RESUMEN                              ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Total de archivos HTML: ${totalFiles}`);
    console.log(`   Completamente actualizados: ${totalUpdated} (${Math.round(totalUpdated/totalFiles*100)}%)`);
    console.log(`   Vacíos/Corruptos: ${totalEmpty}`);
    console.log(`   Pendientes de actualizar: ${totalFiles - totalUpdated - totalEmpty}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    return results;
}

// ============================================
// GENERACIÓN DE TEMPLATES
// ============================================

function generateMangaTemplate(mangaName, imagePath = null) {
    const title = formatTitle(mangaName);
    const urlSafeName = mangaName;
    const img = imagePath || `/img/${mangaName}.jpg`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Lee ${title} en español en Grandiel Scan. Disfruta de este increíble manhwa con actualizaciones regulares.">
    <meta name="keywords" content="${title}, ${title} español, manhwa ${title}, leer ${title}">
    <meta name="author" content="Grandiel Scan">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="book">
    <meta property="og:url" content="${CONFIG.domain}/Mangas/${urlSafeName}.html">
    <meta property="og:title" content="${title} - Grandiel Scan">
    <meta property="og:description" content="Lee ${title} en español gratis en Grandiel Scan.">
    <meta property="og:image" content="${img}">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${CONFIG.domain}/Mangas/${urlSafeName}.html">
    <meta property="twitter:title" content="${title} - Grandiel Scan">
    <meta property="twitter:description" content="Lee ${title} en español gratis en Grandiel Scan.">
    <meta property="twitter:image" content="${img}">

    <link rel="stylesheet" href="/Styles/Style.css">
    <link rel="shortcut icon" href="/img/logo.jpg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Coming+Soon&display=swap" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Dosis:wght@200&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.6.3/css/all.css">
    <script defer src="https://cdn.jsdelivr.net/npm/gsap@3.12.2/dist/gsap.min.js"></script>
    <title>${title} - Grandiel Scan | Leer Online</title>
</head>
<body class="fondo">
    <nav class="alpha" role="navigation" aria-label="Navegación principal">
        <div class="logo">
            <a href="/index.html" aria-label="Ir a inicio"><img src="/img/logo.gif" alt="Grandiel Scan Logo" width="120"></a>
        </div>
        <ul class="list">
            <li><a href="/Mangas.html"><span>Mangas</span></a></li>
            <li><a href="/Actualizaciones.html"><span>Actualizaciones</span></a></li>
            <li><a href="/Nuevos.html"><span>Nuevos</span></a></li>
        </ul>

        <div id="ctn-bars-search">
            <input type="text" id="inputSearch" placeholder="¿Qué deseas buscar?" aria-label="Buscador de manhwas">
            <div id="ctn-icon-search" class="btn" role="button" aria-label="Botón de búsqueda" tabindex="0">
                <i class="fas fa-search" id="icon-search" aria-hidden="true"></i>
            </div>
            <ul id="box-search" role="listbox" aria-label="Resultados de búsqueda"></ul>
        </div>
        <div id="cover-ctn-search"></div>
    </nav>
    <hr class="br">
    <main class="curva" role="main">
        <br>
        <div style="text-align: center;">
            <img style="border-radius: 5%;" src="${img}" alt="Portada de ${title}" width="300" height="430" loading="lazy">
        </div>
        <br>
        <h1 style="text-align: center;">${title}</h1>
        <br>
        <div class="parrafo">
            <p>Descripción de ${title} pendiente de agregar.</p>
        </div>
        <br>
        <section class="capitulos" aria-label="Lista de capítulos">
            <div>
                <!-- Capítulos pendientes de agregar -->
                <p style="text-align: center; color: #888;">Capítulos próximamente...</p>
            </div>
        </section>
    </main>
    <br>
    <footer class="footer" role="contentinfo">
        <div><p>© 2026 Grandiel Scan</p></div>
        <div><p>Contactos:</p></div>
    </footer>

    <!-- Schema.org Markup -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "ComicSeries",
        "name": "${title}",
        "url": "${CONFIG.domain}/Mangas/${urlSafeName}.html",
        "description": "Lee ${title} en español en Grandiel Scan.",
        "image": "${img}",
        "publisher": {
            "@type": "Organization",
            "name": "Grandiel Scan"
        },
        "inLanguage": "es"
    }
    </script>

    <script src="/Styles/nav.js"></script>
    <script src="/Styles/busqueda.js"></script>
    <script src="/Styles/Stylejava.js"></script>
</body>
</html>`;
}

function generateChapterTemplate(mangaName, chapterNum) {
    const title = formatTitle(mangaName);
    const urlSafeManga = mangaName;

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Lee ${title} Capítulo ${chapterNum} en español gratis en Grandiel Scan.">
    <meta name="keywords" content="${title} capitulo ${chapterNum}, ${title} español, leer ${title}">
    <meta name="author" content="Grandiel Scan">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="book">
    <meta property="og:url" content="${CONFIG.domain}/Capitulos/${urlSafeManga} cap ${chapterNum}.html">
    <meta property="og:title" content="${title} - Capítulo ${chapterNum} | Grandiel Scan">
    <meta property="og:description" content="Lee ${title} Capítulo ${chapterNum} en español gratis.">
    <meta property="og:image" content="/img/${mangaName}.jpg">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${CONFIG.domain}/Capitulos/${urlSafeManga} cap ${chapterNum}.html">
    <meta property="twitter:title" content="${title} - Capítulo ${chapterNum} | Grandiel Scan">
    <meta property="twitter:description" content="Lee ${title} Capítulo ${chapterNum} en español gratis.">
    <meta property="twitter:image" content="/img/${mangaName}.jpg">

    <link rel="stylesheet" href="/Styles/Style.css">
    <link rel="shortcut icon" href="/img/logo.jpg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Coming+Soon&display=swap" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Dosis:wght@200&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.6.3/css/all.css">
    <script defer src="/Styles/Stylejava.js"></script>
    <title>${title} - Capítulo ${chapterNum} | Grandiel Scan</title>
</head>
<body class="fondo">
    <nav class="alpha" role="navigation" aria-label="Navegación principal">
        <div class="logo">
            <a href="/index.html" aria-label="Ir a inicio"><img src="/img/logo.gif" alt="Grandiel Scan Logo" width="120"></a>
        </div>
        <ul class="list">
            <li><a href="/Mangas.html"><span>Mangas</span></a></li>
            <li><a href="/Actualizaciones.html"><span>Actualizaciones</span></a></li>
            <li><a href="/Nuevos.html"><span>Nuevos</span></a></li>
        </ul>
        <div class="barra">
            <input type="text" placeholder="Buscar" aria-label="Buscador">
            <div class="btn" role="button" tabindex="0" aria-label="Buscar">
                <i class="fa fa-search" aria-hidden="true"></i>
            </div>
        </div>
    </nav>
    <hr class="br">
    <div id="progress-bar"></div>

    <!-- Breadcrumbs -->
    <nav aria-label="Migas de pan" class="breadcrumbs">
        <ol itemscope itemtype="https://schema.org/BreadcrumbList">
            <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <a itemprop="item" href="/index.html">
                    <span itemprop="name">Inicio</span>
                </a>
                <meta itemprop="position" content="1" />
            </li>
            <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <a itemprop="item" href="/Mangas/${urlSafeManga}.html">
                    <span itemprop="name">${title}</span>
                </a>
                <meta itemprop="position" content="2" />
            </li>
            <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <span itemprop="name">Capítulo ${chapterNum}</span>
                <meta itemprop="position" content="3" />
            </li>
        </ol>
    </nav>

    <br>
    <div class="sig" role="navigation" aria-label="Navegación de capítulos">
        <a href="/Mangas/${urlSafeManga}.html" aria-label="Capítulo anterior"><b style="color: gray;"><</b></a>
        <a href="/Mangas/${urlSafeManga}.html" aria-label="Volver a ${title}"><b>${title} - Cap ${chapterNum}</b></a>
        <a href="/Mangas/${urlSafeManga}.html" aria-label="Siguiente capítulo"><b>></b></a>
    </div>
    <br>

    <div class="chapter-images">
        <!-- Imágenes del capítulo pendientes de agregar -->
        <p style="text-align: center; color: #888;">Imágenes del capítulo pendientes...</p>
    </div>

    <script src="/Styles/nav.js"></script>
</body>
</html>`;
}

// ============================================
// CORRECCIONES
// ============================================

function fixEmptyFiles(results) {
    console.log('\n🔧 REPARANDO ARCHIVOS VACÍOS...\n');
    let fixed = 0;

    // Fix empty manga files
    results.mangas.files
        .filter(f => f.analysis.status === 'empty')
        .forEach(file => {
            const mangaName = file.title;
            const template = generateMangaTemplate(mangaName);
            writeFile(file.path, template);
            console.log(`   ✅ Reparado: ${file.name}`);
            fixed++;
        });

    // Fix empty chapter files
    results.capitulos.files
        .filter(f => f.analysis.status === 'empty')
        .forEach(file => {
            const match = file.title.match(/(.+) cap (\d+)/i);
            if (match) {
                const [, mangaName, chapterNum] = match;
                const template = generateChapterTemplate(mangaName, chapterNum);
                writeFile(file.path, template);
                console.log(`   ✅ Reparado: ${file.name}`);
                fixed++;
            }
        });

    console.log(`\n   Total reparados: ${fixed} archivos\n`);
    return fixed;
}

function updateExistingFile(filePath, content) {
    // Aplica correcciones a archivos existentes que no están vacíos
    let updated = content;
    let changes = [];

    // 1. Corregir lang="en" a lang="es"
    if (updated.includes('lang="en"')) {
        updated = updated.replace('lang="en"', 'lang="es"');
        changes.push('lang="es"');
    }

    // 2. Corregir enlace del logo
    if (updated.includes('href="/Inicio.html"')) {
        updated = updated.replace(/href="\/Inicio\.html"/g, 'href="/index.html"');
        changes.push('logo href corregido');
    }

    // 3. Agregar role="navigation" si falta en nav
    if (updated.includes('<nav') && !updated.includes('role="navigation"')) {
        updated = updated.replace(/<nav([^>]*)>/g, '<nav$1 role="navigation" aria-label="Navegación principal">');
        changes.push('role="navigation"');
    }

    // 4. Agregar class="alpha" a nav si falta
    if (updated.includes('<nav') && !updated.includes('class="alpha"') && !updated.includes("class='alpha'")) {
        updated = updated.replace(/<nav /g, '<nav class="alpha" ');
        changes.push('class="alpha"');
    }

    // 5. Agregar role="main" a main si falta
    if (updated.includes('<main') && !updated.includes('role="main"')) {
        updated = updated.replace(/<main([^>]*)>/g, '<main$1 role="main">');
        changes.push('role="main"');
    }

    // 6. Agregar aria-hidden a iconos FontAwesome
    if (updated.includes('class="fa') && !updated.includes('aria-hidden="true"')) {
        updated = updated.replace(/<i class="fa([^"]*)"([^>]*)>/g, '<i class="fa$1"$2 aria-hidden="true">');
        changes.push('aria-hidden en iconos');
    }

    return { content: updated, changes };
}

function applyMassCorrections(results) {
    console.log('\n🔧 APLICANDO CORRECCIONES MASIVAS...\n');
    let totalFixed = 0;

    // Procesar archivos que necesitan actualización
    const allFiles = [
        ...results.mangas.files,
        ...results.capitulos.files,
        ...results.principales.files
    ].filter(f => f.analysis.status === 'needs_update');

    allFiles.forEach(file => {
        const content = readFile(file.path);
        if (content) {
            const { content: updated, changes } = updateExistingFile(file.path, content);
            if (changes.length > 0) {
                writeFile(file.path, updated);
                console.log(`   ✅ ${file.name}: ${changes.join(', ')}`);
                totalFixed++;
            }
        }
    });

    console.log(`\n   Total archivos corregidos: ${totalFixed}\n`);
    return totalFixed;
}

// ============================================
// GENERACIÓN DE SITEMAP
// ============================================

function generateSitemap(results) {
    console.log('\n📄 GENERANDO SITEMAP.XML...\n');

    const today = new Date().toISOString().split('T')[0];
    let urls = [];

    // Páginas principales
    urls.push({ loc: '/', priority: '1.0', changefreq: 'daily' });
    urls.push({ loc: '/index.html', priority: '1.0', changefreq: 'daily' });
    urls.push({ loc: '/Mangas.html', priority: '0.9', changefreq: 'weekly' });
    urls.push({ loc: '/Actualizaciones.html', priority: '0.9', changefreq: 'daily' });
    urls.push({ loc: '/Nuevos.html', priority: '0.8', changefreq: 'weekly' });

    // Mangas
    results.mangas.files.forEach(file => {
        if (file.analysis.status !== 'empty') {
            urls.push({
                loc: `/Mangas/${encodeURIComponent(file.name)}`,
                priority: '0.7',
                changefreq: 'weekly'
            });
        }
    });

    // Capítulos
    results.capitulos.files.forEach(file => {
        if (file.analysis.status !== 'empty') {
            urls.push({
                loc: `/Capitulos/${encodeURIComponent(file.name)}`,
                priority: '0.6',
                changefreq: 'monthly'
            });
        }
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `
  <url>
    <loc>${CONFIG.domain}${url.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('')}
</urlset>`;

    writeFile(path.join(CONFIG.baseDir, 'sitemap.xml'), sitemap);
    console.log(`   ✅ sitemap.xml generado con ${urls.length} URLs\n`);
    return urls.length;
}

// ============================================
// GENERACIÓN DE LISTA PARA NAV.JS
// ============================================

function generateNavList(results) {
    console.log('\n📋 GENERANDO LISTA DE MANGAS PARA NAV.JS...\n');

    const mangaList = results.mangas.files
        .filter(f => f.analysis.status !== 'empty')
        .map(file => ({
            title: formatTitle(file.title),
            url: `/Mangas/${file.name}`
        }))
        .sort((a, b) => a.title.localeCompare(b.title));

    const jsCode = `// Lista de mangas para búsqueda - Generado automáticamente
// Total: ${mangaList.length} mangas
const mangaList = [
${mangaList.map(m => `    { title: "${m.title}", url: "${m.url}" }`).join(',\n')}
];`;

    // Guardar en archivo separado para referencia
    writeFile(path.join(CONFIG.baseDir, 'scripts', 'mangaList.js'), jsCode);
    console.log(`   ✅ mangaList.js generado con ${mangaList.length} mangas`);
    console.log(`   📁 Guardado en: scripts/mangaList.js`);
    console.log(`   ℹ️  Copia el contenido a nav.js para actualizar la búsqueda\n`);

    return mangaList;
}

// ============================================
// COMANDOS PRINCIPALES
// ============================================

function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'scan';

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║       GRANDIEL SCAN - SCRIPT DE AUTOMATIZACIÓN             ║');
    console.log('║                     Fase 1.5                               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const results = scanAllFiles();

    switch (command) {
        case 'scan':
            printReport(results);
            break;

        case 'fix':
            printReport(results);
            fixEmptyFiles(results);
            applyMassCorrections(results);
            // Re-escanear después de correcciones
            console.log('\n🔄 RE-ESCANEANDO DESPUÉS DE CORRECCIONES...');
            const newResults = scanAllFiles();
            printReport(newResults);
            break;

        case 'sitemap':
            generateSitemap(results);
            break;

        case 'navlist':
            generateNavList(results);
            break;

        case 'all':
            printReport(results);
            fixEmptyFiles(results);
            applyMassCorrections(results);
            generateSitemap(scanAllFiles());
            generateNavList(scanAllFiles());
            break;

        default:
            console.log(`
Uso: node scripts/automatizacion.js [comando]

Comandos disponibles:
  scan     - Escanea y reporta estado de archivos (por defecto)
  fix      - Repara archivos vacíos y aplica correcciones
  sitemap  - Genera sitemap.xml completo
  navlist  - Genera lista de mangas para nav.js
  all      - Ejecuta todas las correcciones
            `);
    }
}

main();
