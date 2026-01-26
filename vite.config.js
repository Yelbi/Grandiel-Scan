/**
 * vite.config.js - Configuración de Vite
 * Grandiel Scan - Fase 4 Optimización de Performance
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    // Directorio raíz del proyecto
    root: '.',

    // Directorio público (archivos que no se procesan)
    publicDir: 'public',

    // Configuración del servidor de desarrollo
    server: {
        port: 3000,
        open: true,
        cors: true
    },

    // Configuración de build
    build: {
        // Directorio de salida
        outDir: 'dist',

        // Directorio de assets dentro de dist
        assetsDir: 'assets',

        // Generar source maps para debugging
        sourcemap: true,

        // Minificar código
        minify: 'terser',

        // Opciones de terser
        terserOptions: {
            compress: {
                drop_console: true, // Eliminar console.log en producción
                drop_debugger: true
            }
        },

        // Configuración de rollup
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                mangas: resolve(__dirname, 'Mangas.html'),
                actualizaciones: resolve(__dirname, 'Actualizaciones.html'),
                nuevos: resolve(__dirname, 'Nuevos.html'),
                manga: resolve(__dirname, 'manga.html'),
                chapter: resolve(__dirname, 'chapter.html')
            },
            output: {
                // Separar chunks por módulo
                manualChunks: {
                    'vendor': ['gsap'],
                    'app-core': [
                        './js/config.js',
                        './js/modules/storage.js',
                        './js/modules/theme.js'
                    ],
                    'app-features': [
                        './js/modules/search.js',
                        './js/modules/filter.js',
                        './js/modules/navigation.js'
                    ]
                },
                // Nombres de archivos con hash para cache busting
                entryFileNames: 'assets/js/[name]-[hash].js',
                chunkFileNames: 'assets/js/[name]-[hash].js',
                assetFileNames: (assetInfo) => {
                    const extType = assetInfo.name.split('.').pop();
                    if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(extType)) {
                        return 'assets/img/[name]-[hash][extname]';
                    }
                    if (/css/i.test(extType)) {
                        return 'assets/css/[name]-[hash][extname]';
                    }
                    if (/woff|woff2|eot|ttf|otf/i.test(extType)) {
                        return 'assets/fonts/[name]-[hash][extname]';
                    }
                    return 'assets/[name]-[hash][extname]';
                }
            }
        },

        // Tamaño máximo de chunks antes de warning
        chunkSizeWarningLimit: 500,

        // CSS code splitting
        cssCodeSplit: true
    },

    // Optimizaciones
    optimizeDeps: {
        include: ['gsap']
    },

    // Resolución de módulos
    resolve: {
        alias: {
            '@': resolve(__dirname, './js'),
            '@styles': resolve(__dirname, './Styles'),
            '@img': resolve(__dirname, './img')
        }
    },

    // Configuración de CSS
    css: {
        devSourcemap: true
    }
});
