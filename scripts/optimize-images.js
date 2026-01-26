/**
 * optimize-images.js - Script de Optimización de Imágenes
 * Grandiel Scan - Fase 4 Optimización de Performance
 *
 * Convierte imágenes a WebP, genera múltiples tamaños
 * y optimiza para mejor rendimiento.
 *
 * Uso: npm run optimize-images
 * Requisito: npm install sharp
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const CONFIG = {
    // Directorio de imágenes fuente
    inputDir: path.join(__dirname, '..', 'img'),

    // Directorio de salida
    outputDir: path.join(__dirname, '..', 'img', 'optimized'),

    // Tamaños a generar
    sizes: {
        thumbnail: { width: 230, height: 350 },  // Listados
        medium: { width: 460, height: 700 },     // Páginas de detalle
        large: { width: 600, height: 900 }       // Full size
    },

    // Calidad de compresión
    quality: {
        webp: 80,
        jpeg: 85,
        png: 85
    },

    // Extensiones a procesar
    validExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],

    // Archivos a ignorar
    ignorePatterns: ['logo.gif', 'logo.jpg', 'icons']
};

/**
 * Crea los directorios necesarios
 */
async function createDirectories() {
    const dirs = [
        CONFIG.outputDir,
        path.join(CONFIG.outputDir, 'thumbnail'),
        path.join(CONFIG.outputDir, 'medium'),
        path.join(CONFIG.outputDir, 'large'),
        path.join(CONFIG.outputDir, 'webp')
    ];

    for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
    }

    console.log('✓ Directorios creados');
}

/**
 * Obtiene lista de imágenes a procesar
 * @returns {Promise<string[]>}
 */
async function getImageFiles() {
    const files = await fs.readdir(CONFIG.inputDir);

    return files.filter(file => {
        const ext = path.extname(file).toLowerCase();

        // Verificar extensión válida
        if (!CONFIG.validExtensions.includes(ext)) {
            return false;
        }

        // Verificar que no esté en la lista de ignorados
        for (const pattern of CONFIG.ignorePatterns) {
            if (file.includes(pattern)) {
                return false;
            }
        }

        return true;
    });
}

/**
 * Procesa una imagen individual
 * @param {string} filename - Nombre del archivo
 */
async function processImage(filename) {
    const inputPath = path.join(CONFIG.inputDir, filename);
    const baseName = path.parse(filename).name;

    try {
        const image = sharp(inputPath);
        const metadata = await image.metadata();

        console.log(`\nProcesando: ${filename}`);
        console.log(`  Tamaño original: ${metadata.width}x${metadata.height}`);

        // Generar WebP del original
        await image
            .webp({ quality: CONFIG.quality.webp })
            .toFile(path.join(CONFIG.outputDir, 'webp', `${baseName}.webp`));

        console.log(`  ✓ WebP generado`);

        // Generar diferentes tamaños
        for (const [sizeName, dimensions] of Object.entries(CONFIG.sizes)) {
            const outputPath = path.join(CONFIG.outputDir, sizeName, `${baseName}.webp`);

            await sharp(inputPath)
                .resize(dimensions.width, dimensions.height, {
                    fit: 'cover',
                    position: 'center'
                })
                .webp({ quality: CONFIG.quality.webp })
                .toFile(outputPath);

            // También generar JPEG como fallback
            const jpegPath = path.join(CONFIG.outputDir, sizeName, `${baseName}.jpg`);
            await sharp(inputPath)
                .resize(dimensions.width, dimensions.height, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ quality: CONFIG.quality.jpeg })
                .toFile(jpegPath);

            console.log(`  ✓ ${sizeName}: ${dimensions.width}x${dimensions.height}`);
        }

        return { success: true, filename };
    } catch (error) {
        console.error(`  ✗ Error: ${error.message}`);
        return { success: false, filename, error: error.message };
    }
}

/**
 * Genera iconos para PWA
 */
async function generatePWAIcons() {
    const logoPath = path.join(CONFIG.inputDir, 'logo.jpg');
    const iconsDir = path.join(CONFIG.inputDir, 'icons');

    await fs.mkdir(iconsDir, { recursive: true });

    const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

    console.log('\nGenerando iconos PWA...');

    try {
        for (const size of iconSizes) {
            await sharp(logoPath)
                .resize(size, size, {
                    fit: 'cover',
                    position: 'center'
                })
                .png()
                .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));

            console.log(`  ✓ icon-${size}x${size}.png`);
        }

        // Badge para notificaciones
        await sharp(logoPath)
            .resize(72, 72)
            .png()
            .toFile(path.join(iconsDir, 'badge-72x72.png'));

        console.log('  ✓ badge-72x72.png');

        return true;
    } catch (error) {
        console.error(`Error generando iconos: ${error.message}`);
        return false;
    }
}

/**
 * Genera reporte de optimización
 * @param {Object[]} results - Resultados del procesamiento
 */
async function generateReport(results) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    const report = {
        timestamp: new Date().toISOString(),
        totalProcessed: results.length,
        successful: successful.length,
        failed: failed.length,
        failedFiles: failed.map(f => ({ filename: f.filename, error: f.error }))
    };

    const reportPath = path.join(CONFIG.outputDir, 'optimization-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log('\n========== RESUMEN ==========');
    console.log(`Total procesadas: ${results.length}`);
    console.log(`Exitosas: ${successful.length}`);
    console.log(`Fallidas: ${failed.length}`);

    if (failed.length > 0) {
        console.log('\nArchivos fallidos:');
        failed.forEach(f => console.log(`  - ${f.filename}: ${f.error}`));
    }

    console.log(`\nReporte guardado en: ${reportPath}`);
}

/**
 * Función principal
 */
async function main() {
    console.log('🖼️  Optimizador de Imágenes - Grandiel Scan');
    console.log('=========================================\n');

    try {
        // Crear directorios
        await createDirectories();

        // Obtener lista de imágenes
        const imageFiles = await getImageFiles();
        console.log(`\nEncontradas ${imageFiles.length} imágenes para procesar`);

        if (imageFiles.length === 0) {
            console.log('No hay imágenes para procesar.');
            return;
        }

        // Procesar imágenes
        const results = [];
        for (const file of imageFiles) {
            const result = await processImage(file);
            results.push(result);
        }

        // Generar iconos PWA
        await generatePWAIcons();

        // Generar reporte
        await generateReport(results);

        console.log('\n✅ Optimización completada!');
    } catch (error) {
        console.error('\n❌ Error fatal:', error);
        process.exit(1);
    }
}

// Ejecutar
main();
