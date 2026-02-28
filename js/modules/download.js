/**
 * download.js - Sistema de Descarga de Capítulos
 * Grandiel Scan - Fase 6.2 Características Avanzadas
 *
 * Permite descargar capítulos como archivos ZIP con todas las imágenes.
 */

/**
 * Clase ChapterDownloader - Gestiona la descarga de capítulos
 */
class ChapterDownloader {
    constructor() {
        this.isDownloading = false;
        this.progressModal = null;
        this.JSZip = null;
    }

    /**
     * Inicializa el sistema de descarga
     */
    async init() {
        await this.loadJSZip();
        this.createDownloadButton();
        this.createProgressModal();
    }

    /**
     * Carga la librería JSZip dinámicamente
     */
    async loadJSZip() {
        if (window.JSZip) {
            this.JSZip = window.JSZip;
            return;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = () => {
                this.JSZip = window.JSZip;
                resolve();
            };
            script.onerror = () => {
                console.error('Error al cargar JSZip');
                reject(new Error('No se pudo cargar JSZip'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Crea el botón de descarga
     */
    createDownloadButton() {
        // Buscar la navegación de capítulos para insertar el botón
        const navContainer = document.querySelector('.sig');
        if (!navContainer) return;

        // Verificar si ya existe
        if (document.getElementById('download-chapter-btn')) return;

        const downloadBtn = document.createElement('button');
        downloadBtn.id = 'download-chapter-btn';
        downloadBtn.className = 'download-chapter-btn';
        downloadBtn.innerHTML = `
            <i class="fas fa-download" aria-hidden="true"></i>
            <span>Descargar</span>
        `;
        downloadBtn.title = 'Descargar capítulo';
        downloadBtn.addEventListener('click', () => this.downloadCurrentChapter());

        // Insertar después del nav
        navContainer.parentNode.insertBefore(downloadBtn, navContainer.nextSibling);
    }

    /**
     * Crea el modal de progreso
     */
    createProgressModal() {
        if (document.getElementById('download-progress-modal')) return;

        this.progressModal = document.createElement('div');
        this.progressModal.id = 'download-progress-modal';
        this.progressModal.className = 'download-modal';
        this.progressModal.innerHTML = `
            <div class="download-modal-content">
                <div class="download-icon">
                    <i class="fas fa-file-archive" aria-hidden="true"></i>
                </div>
                <h3 class="download-title">Descargando capítulo</h3>
                <p class="download-status" id="download-status">Preparando...</p>
                <div class="download-progress-bar">
                    <div class="download-progress-fill" id="download-progress-fill"></div>
                </div>
                <p class="download-percent" id="download-percent">0%</p>
                <button type="button" class="download-cancel-btn" id="download-cancel-btn">Cancelar</button>
            </div>
        `;
        document.body.appendChild(this.progressModal);

        // Botón de cancelar
        document.getElementById('download-cancel-btn').addEventListener('click', () => {
            this.cancelDownload();
        });
    }

    /**
     * Descarga el capítulo actual
     */
    async downloadCurrentChapter() {
        if (this.isDownloading) return;

        // Obtener información del capítulo desde la URL
        const urlParams = new URLSearchParams(window.location.search);
        const mangaId = urlParams.get('manga');
        const chapterNum = urlParams.get('cap');

        if (!mangaId || !chapterNum) {
            this.showError('No se pudo obtener la información del capítulo');
            return;
        }

        // Obtener las imágenes del contenedor
        const container = document.getElementById('chapter-images');
        if (!container) {
            this.showError('No se encontró el contenedor de imágenes');
            return;
        }

        const images = container.querySelectorAll('img');
        if (images.length === 0) {
            this.showError('No hay imágenes para descargar');
            return;
        }

        // Obtener título del manga
        const titleElement = document.getElementById('current-chapter');
        const title = titleElement ? titleElement.textContent : `${mangaId} - Cap ${chapterNum}`;

        // Iniciar descarga
        this.isDownloading = true;
        this.showProgressModal();

        try {
            await this.createZipAndDownload(images, title, mangaId, chapterNum);
        } catch (error) {
            console.error('Error en la descarga:', error);
            this.showError('Error al descargar el capítulo');
        } finally {
            this.isDownloading = false;
            this.hideProgressModal();
        }
    }

    /**
     * Crea el ZIP y descarga
     */
    async createZipAndDownload(images, title, mangaId, chapterNum) {
        if (!this.JSZip) {
            await this.loadJSZip();
        }

        const zip = new this.JSZip();
        const folder = zip.folder(`${mangaId}_cap_${chapterNum}`);
        const totalImages = images.length;
        let downloadedImages = 0;
        let failedImages = 0;

        this.updateProgress(0, `Descargando 0/${totalImages} imágenes...`);

        // Descargar imágenes en paralelo (con límite)
        const batchSize = 3;
        const imageArray = Array.from(images);

        for (let i = 0; i < imageArray.length; i += batchSize) {
            if (!this.isDownloading) {
                throw new Error('Descarga cancelada');
            }

            const batch = imageArray.slice(i, i + batchSize);
            const promises = batch.map(async (img, batchIndex) => {
                const index = i + batchIndex;
                const pageNum = String(index + 1).padStart(3, '0');

                try {
                    const imageData = await this.fetchImage(img.src);
                    const extension = this.getExtension(img.src);
                    folder.file(`pagina_${pageNum}.${extension}`, imageData, { binary: true });
                    downloadedImages++;
                } catch (error) {
                    console.warn(`Error descargando imagen ${index + 1}:`, error);
                    failedImages++;
                }

                const progress = Math.round(((downloadedImages + failedImages) / totalImages) * 100);
                this.updateProgress(progress, `Descargando ${downloadedImages + failedImages}/${totalImages} imágenes...`);
            });

            await Promise.all(promises);
        }

        if (downloadedImages === 0) {
            throw new Error('No se pudo descargar ninguna imagen');
        }

        // Generar el ZIP
        this.updateProgress(100, 'Generando archivo ZIP...');

        const content = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        }, (metadata) => {
            const progress = Math.round(metadata.percent);
            this.updateProgress(progress, `Comprimiendo... ${progress}%`);
        });

        // Descargar el archivo
        const filename = this.sanitizeFilename(`${title}.zip`);
        this.downloadBlob(content, filename);

        if (failedImages > 0) {
            this.showToast(`Descarga completada. ${failedImages} imagen(es) no se pudieron descargar.`, 'warning');
        } else {
            this.showToast('Descarga completada exitosamente', 'success');
        }
    }

    /**
     * Obtiene una imagen como ArrayBuffer
     */
    async fetchImage(url) {
        // Intentar usar fetch con cors
        try {
            const response = await fetch(url, {
                mode: 'cors',
                credentials: 'omit'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.arrayBuffer();
        } catch (error) {
            // Si falla CORS, intentar con proxy o imagen del DOM
            return this.getImageFromCanvas(url);
        }
    }

    /**
     * Obtiene imagen usando canvas (para imágenes con CORS issues)
     */
    getImageFromCanvas(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Canvas 2D no disponible'));
                        return;
                    }
                    ctx.drawImage(img, 0, 0);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            blob.arrayBuffer().then(resolve).catch(reject);
                        } else {
                            reject(new Error('No se pudo crear blob'));
                        }
                    }, 'image/jpeg', 0.95);
                } catch (e) {
                    reject(e);
                }
            };

            img.onerror = () => reject(new Error('Error cargando imagen'));
            img.src = url;
        });
    }

    /**
     * Obtiene la extensión de una URL de imagen
     */
    getExtension(url) {
        const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
        if (match) {
            const ext = match[1].toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                return ext;
            }
        }
        return 'jpg';
    }

    /**
     * Sanitiza el nombre del archivo
     */
    sanitizeFilename(filename) {
        return filename.replace(/[<>:"/\\|?*]/g, '_').trim();
    }

    /**
     * Descarga un blob como archivo
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Muestra el modal de progreso
     */
    showProgressModal() {
        if (this.progressModal) {
            this.progressModal.classList.add('active');
        }
    }

    /**
     * Oculta el modal de progreso
     */
    hideProgressModal() {
        if (this.progressModal) {
            this.progressModal.classList.remove('active');
        }
    }

    /**
     * Actualiza el progreso
     */
    updateProgress(percent, status) {
        const fill = document.getElementById('download-progress-fill');
        const percentText = document.getElementById('download-percent');
        const statusText = document.getElementById('download-status');

        if (fill) fill.style.width = `${percent}%`;
        if (percentText) percentText.textContent = `${percent}%`;
        if (statusText) statusText.textContent = status;
    }

    /**
     * Cancela la descarga
     */
    cancelDownload() {
        this.isDownloading = false;
        this.hideProgressModal();
        this.showToast('Descarga cancelada', 'info');
    }

    /**
     * Muestra un mensaje de error
     */
    showError(message) {
        this.showToast(message, 'error');
    }

    /**
     * Muestra un toast
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `download-toast download-toast-${type}`;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type]}" aria-hidden="true"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
}

// Instancia singleton
const downloaderInstance = new ChapterDownloader();

/**
 * Inicializa el sistema de descarga
 */
export const initDownloader = () => {
    downloaderInstance.init();
};

export default downloaderInstance;
