/**
 * Chapter Renderer - Renderiza dinamicamente las paginas de capitulos
 * Uso: chapter.html?manga=nano-machine&cap=1
 *
 * Soporta dos modos de lectura:
 * - Paginado: muestra paginas una a una
 * - Continuo: muestra todas las paginas en scroll vertical
 */

(function() {
    'use strict';

    // Obtener parametros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const mangaId = urlParams.get('manga');
    const chapterNum = parseInt(urlParams.get('cap'), 10);

    if (!mangaId || isNaN(chapterNum)) {
        showError('Parametros invalidos. Uso: chapter.html?manga=ID&cap=NUMERO');
        return;
    }

    // Variables globales para navegacion
    let mangaData = null;
    let allChapters = [];
    let currentReadingMode = getReadingMode();
    let chapterPages = [];
    let currentPageIndex = 0;

    // Cargar datos
    loadData();

    async function loadData() {
        try {
            // Cargar ambos JSON en paralelo
            const [mangasResponse, chaptersResponse] = await Promise.all([
                fetch('/data/mangas.json'),
                fetch('/data/chapters.json')
            ]);

            if (!mangasResponse.ok || !chaptersResponse.ok) {
                throw new Error('Error al cargar los datos');
            }

            const mangasData = await mangasResponse.json();
            const chaptersData = await chaptersResponse.json();

            // Buscar el manga
            mangaData = mangasData.mangas.find(m => m.id === mangaId);
            if (!mangaData) {
                showError('Manga no encontrado: ' + mangaId);
                return;
            }

            // Buscar el capitulo
            const chapterData = chaptersData.chapters.find(
                c => c.mangaId === mangaId && c.chapter === chapterNum
            );

            if (!chapterData) {
                showError(`Capitulo ${chapterNum} no encontrado para ${mangaData.title}`);
                return;
            }

            // Obtener todos los capitulos de este manga para la navegacion
            allChapters = mangaData.chapters || [];

            renderChapter(mangaData, chapterData);
        } catch (error) {
            console.error('Error:', error);
            showError('Error al cargar el capitulo');
        }
    }

    function renderChapter(manga, chapter) {
        const baseUrl = 'https://grandielscan.com';

        // Actualizar titulo de la pagina
        document.getElementById('page-title').textContent =
            `${manga.title} - Capitulo ${chapterNum} | Grandiel Scan`;

        // Actualizar meta tags
        const description = `Lee ${manga.title} Capitulo ${chapterNum} en espanol gratis en Grandiel Scan.`;
        document.getElementById('meta-description').content = description;
        document.getElementById('meta-keywords').content =
            `${manga.title} capitulo ${chapterNum}, ${manga.title} espanol, leer ${manga.title}`;

        // Open Graph
        document.getElementById('og-url').content = `${baseUrl}/chapter.html?manga=${manga.id}&cap=${chapterNum}`;
        document.getElementById('og-title').content = `${manga.title} - Capitulo ${chapterNum} | Grandiel Scan`;
        document.getElementById('og-description').content = description;
        document.getElementById('og-image').content = manga.image;

        // Twitter
        document.getElementById('twitter-url').content = `${baseUrl}/chapter.html?manga=${manga.id}&cap=${chapterNum}`;
        document.getElementById('twitter-title').content = `${manga.title} - Capitulo ${chapterNum} | Grandiel Scan`;
        document.getElementById('twitter-description').content = description;
        document.getElementById('twitter-image').content = manga.image;

        // Breadcrumbs
        document.getElementById('breadcrumb-manga-link').href = `/manga.html?id=${manga.id}`;
        document.getElementById('breadcrumb-manga-title').textContent = manga.title;
        document.getElementById('breadcrumb-chapter').textContent = `Capitulo ${chapterNum}`;

        // Navegacion de capitulos
        setupNavigation(manga);

        // Selector de capitulo
        setupChapterSelector(manga);

        // Renderizar imagenes
        renderImages(chapter);

        // Actualizar texto del capitulo actual
        document.getElementById('current-chapter').textContent = `${manga.title} - Cap ${chapterNum}`;
    }

    function setupNavigation(manga) {
        const sortedChapters = [...allChapters].sort((a, b) => a - b);
        const currentIndex = sortedChapters.indexOf(chapterNum);

        const prevChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
        const nextChapter = currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null;

        // Links superiores
        const prevLink = document.getElementById('prev-chapter');
        const nextLink = document.getElementById('next-chapter');
        const mangaLink = document.getElementById('manga-link');

        // Links inferiores
        const prevLinkBottom = document.getElementById('prev-chapter-bottom');
        const nextLinkBottom = document.getElementById('next-chapter-bottom');
        const mangaLinkBottom = document.getElementById('manga-link-bottom');

        // Configurar link al manga
        const mangaUrl = `/manga.html?id=${manga.id}`;
        mangaLink.href = mangaUrl;
        mangaLinkBottom.href = mangaUrl;

        // Configurar navegacion anterior
        if (prevChapter !== null) {
            const prevUrl = `/chapter.html?manga=${manga.id}&cap=${prevChapter}`;
            prevLink.href = prevUrl;
            prevLinkBottom.href = prevUrl;
            document.getElementById('prev-symbol').style.color = '';
            document.getElementById('prev-symbol-bottom').style.color = '';
        } else {
            prevLink.href = mangaUrl;
            prevLinkBottom.href = mangaUrl;
            prevLink.classList.add('chapter-nav-disabled');
            prevLinkBottom.classList.add('chapter-nav-disabled');
        }

        // Configurar navegacion siguiente
        if (nextChapter !== null) {
            const nextUrl = `/chapter.html?manga=${manga.id}&cap=${nextChapter}`;
            nextLink.href = nextUrl;
            nextLinkBottom.href = nextUrl;
            document.getElementById('next-symbol').style.color = '';
            document.getElementById('next-symbol-bottom').style.color = '';
        } else {
            nextLink.href = mangaUrl;
            nextLinkBottom.href = mangaUrl;
            nextLink.classList.add('chapter-nav-disabled');
            nextLinkBottom.classList.add('chapter-nav-disabled');
            document.getElementById('next-symbol').style.color = 'gray';
            document.getElementById('next-symbol-bottom').style.color = 'gray';
        }
    }

    function setupChapterSelector(manga) {
        const selector = document.getElementById('chapter-selector');
        const sortedChapters = [...allChapters].sort((a, b) => a - b);

        // Limpiar opciones existentes
        selector.innerHTML = '';

        // Agregar opciones
        sortedChapters.forEach(cap => {
            const option = document.createElement('option');
            option.value = cap;
            option.textContent = `Capitulo ${cap}`;
            if (cap === chapterNum) {
                option.selected = true;
            }
            selector.appendChild(option);
        });

        // Event listener para cambio de capitulo
        selector.addEventListener('change', function() {
            const selectedCap = this.value;
            if (selectedCap) {
                window.location.href = `/chapter.html?manga=${manga.id}&cap=${selectedCap}`;
            }
        });
    }

    function renderImages(chapter) {
        const container = document.getElementById('chapter-images');
        const pages = chapter.pages || [];

        if (pages.length === 0) {
            container.innerHTML = '<p style="color: #ff6b6b; text-align: center; padding: 50px;">No hay imagenes disponibles para este capitulo</p>';
            return;
        }

        // Guardar paginas para uso en modos de lectura
        chapterPages = pages.map((page, index) => ({
            url: chapter.baseUrl + page,
            index: index
        }));

        // Configurar controles de modo de lectura
        setupReadingModeControls();

        // Renderizar segun el modo actual
        renderImagesForMode();
    }

    function showError(message) {
        const pageTitle = document.getElementById('page-title');
        const currentChapter = document.getElementById('current-chapter');
        const chapterImages = document.getElementById('chapter-images');
        const breadcrumbs = document.querySelector('.breadcrumbs');
        const sig = document.querySelector('.sig');
        const chapterSelector = document.getElementById('chapter-selector');

        if (pageTitle) pageTitle.textContent = 'Error - Grandiel Scan';
        if (currentChapter) currentChapter.textContent = 'Error';
        if (chapterImages) {
            chapterImages.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <p style="color: #ff6b6b; font-size: 18px;">${message}</p>
                    <p style="margin-top: 20px;">
                        <a href="/Mangas.html" style="color: #4dabf7; text-decoration: underline;">Volver al catalogo</a>
                    </p>
                </div>
            `;
        }

        // Ocultar elementos de navegacion con null checks
        if (breadcrumbs) breadcrumbs.style.display = 'none';
        if (sig) sig.style.display = 'none';
        if (chapterSelector && chapterSelector.parentElement) {
            chapterSelector.parentElement.style.display = 'none';
        }
    }

    // Verificar disponibilidad de localStorage
    function isLocalStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Guardar progreso de lectura en localStorage
    function saveReadingProgress() {
        if (!isLocalStorageAvailable()) {
            console.warn('localStorage no disponible');
            return;
        }

        try {
            const progress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
            progress[mangaId] = {
                chapter: chapterNum,
                timestamp: Date.now()
            };
            localStorage.setItem('readingProgress', JSON.stringify(progress));
        } catch (e) {
            console.warn('No se pudo guardar el progreso de lectura:', e.message);
        }
    }

    // Guardar progreso cuando se carga la pagina
    if (mangaId && !isNaN(chapterNum)) {
        saveReadingProgress();
    }

    // ===== MODO DE LECTURA =====

    /**
     * Obtiene el modo de lectura actual
     */
    function getReadingMode() {
        if (!isLocalStorageAvailable()) return 'continuous';
        try {
            // Intentar obtener del perfil de usuario primero
            const userProfile = JSON.parse(localStorage.getItem('grandiel-user-profile') || 'null');
            if (userProfile && userProfile.settings && userProfile.settings.readingMode) {
                return userProfile.settings.readingMode;
            }
            // Si no hay perfil, usar preferencia independiente
            return localStorage.getItem('grandiel-reading-mode') || 'continuous';
        } catch (e) {
            return 'continuous';
        }
    }

    /**
     * Guarda el modo de lectura
     */
    function setReadingMode(mode) {
        if (!isLocalStorageAvailable()) return;
        try {
            localStorage.setItem('grandiel-reading-mode', mode);
            currentReadingMode = mode;

            // Disparar evento para sincronizar
            window.dispatchEvent(new CustomEvent('grandiel:reading-mode-change', {
                detail: { mode }
            }));
        } catch (e) {
            console.warn('No se pudo guardar el modo de lectura:', e.message);
        }
    }

    /**
     * Alterna el modo de lectura
     */
    function toggleReadingMode() {
        const newMode = currentReadingMode === 'continuous' ? 'paginated' : 'continuous';
        setReadingMode(newMode);
        updateReadingModeUI();
        renderImagesForMode();
    }

    /**
     * Actualiza la UI del modo de lectura
     */
    function updateReadingModeUI() {
        const toggleBtn = document.getElementById('reading-mode-toggle');
        const modeLabel = document.getElementById('reading-mode-label');
        const container = document.getElementById('chapter-images');

        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = currentReadingMode === 'continuous'
                    ? 'fas fa-scroll'
                    : 'fas fa-file-image';
            }
        }

        if (modeLabel) {
            modeLabel.textContent = currentReadingMode === 'continuous'
                ? 'Continuo'
                : 'Paginado';
        }

        if (container) {
            container.className = currentReadingMode === 'continuous'
                ? 'dede reading-mode-continuous'
                : 'dede reading-mode-paginated';
        }

        // Mostrar/ocultar controles de paginacion
        const pageControls = document.getElementById('page-controls');
        if (pageControls) {
            pageControls.style.display = currentReadingMode === 'paginated' ? 'flex' : 'none';
        }
    }

    /**
     * Renderiza imagenes segun el modo actual
     */
    function renderImagesForMode() {
        if (chapterPages.length === 0) return;

        const container = document.getElementById('chapter-images');
        if (!container) return;

        if (currentReadingMode === 'continuous') {
            renderContinuousMode(container);
        } else {
            renderPaginatedMode(container);
        }
    }

    /**
     * Renderiza en modo continuo (todas las paginas)
     */
    function renderContinuousMode(container) {
        let html = '';
        chapterPages.forEach((page, index) => {
            html += `<img src="${page.url}" alt="${mangaData.title} Capitulo ${chapterNum} - Pagina ${index + 1}" loading="lazy" class="chapter-page">`;
        });
        container.innerHTML = html;

        // Manejo de errores
        container.querySelectorAll('img').forEach(img => {
            img.addEventListener('error', function() {
                this.style.display = 'none';
                console.warn('Error cargando imagen:', this.src);
            });
        });
    }

    /**
     * Renderiza en modo paginado (una pagina a la vez)
     */
    function renderPaginatedMode(container) {
        if (chapterPages.length === 0) return;

        const page = chapterPages[currentPageIndex];
        container.innerHTML = `
            <div class="paginated-container">
                <img src="${page.url}" alt="${mangaData.title} Capitulo ${chapterNum} - Pagina ${currentPageIndex + 1}" class="chapter-page-single">
            </div>
        `;

        // Actualizar contador de paginas
        updatePageCounter();

        // Manejo de errores
        const img = container.querySelector('img');
        if (img) {
            img.addEventListener('error', function() {
                this.alt = 'Error al cargar imagen';
                console.warn('Error cargando imagen:', this.src);
            });

            // Click para avanzar pagina
            img.addEventListener('click', function(e) {
                const rect = this.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const halfWidth = rect.width / 2;

                if (clickX > halfWidth) {
                    nextPage();
                } else {
                    prevPage();
                }
            });
        }
    }

    /**
     * Actualiza el contador de paginas
     */
    function updatePageCounter() {
        const counter = document.getElementById('page-counter');
        if (counter) {
            counter.textContent = `${currentPageIndex + 1} / ${chapterPages.length}`;
        }
    }

    /**
     * Va a la pagina anterior
     */
    function prevPage() {
        if (currentPageIndex > 0) {
            currentPageIndex--;
            renderPaginatedMode(document.getElementById('chapter-images'));
            window.scrollTo(0, 0);
        }
    }

    /**
     * Va a la pagina siguiente
     */
    function nextPage() {
        if (currentPageIndex < chapterPages.length - 1) {
            currentPageIndex++;
            renderPaginatedMode(document.getElementById('chapter-images'));
            window.scrollTo(0, 0);
        }
    }

    /**
     * Configura los controles de modo de lectura
     */
    function setupReadingModeControls() {
        // Crear controles si no existen
        let controlsContainer = document.getElementById('reading-controls');
        if (!controlsContainer) {
            const chapterSelector = document.getElementById('chapter-selector');
            if (chapterSelector && chapterSelector.parentElement) {
                controlsContainer = document.createElement('div');
                controlsContainer.id = 'reading-controls';
                controlsContainer.className = 'reading-controls';
                controlsContainer.innerHTML = `
                    <button type="button" id="reading-mode-toggle" class="reading-mode-btn" title="Cambiar modo de lectura">
                        <i class="${currentReadingMode === 'continuous' ? 'fas fa-scroll' : 'fas fa-file-image'}" aria-hidden="true"></i>
                        <span id="reading-mode-label">${currentReadingMode === 'continuous' ? 'Continuo' : 'Paginado'}</span>
                    </button>
                `;
                chapterSelector.parentElement.appendChild(controlsContainer);
            }
        }

        // Crear controles de paginacion
        let pageControls = document.getElementById('page-controls');
        if (!pageControls) {
            const container = document.getElementById('chapter-images');
            if (container && container.parentElement) {
                pageControls = document.createElement('div');
                pageControls.id = 'page-controls';
                pageControls.className = 'page-controls';
                pageControls.style.display = currentReadingMode === 'paginated' ? 'flex' : 'none';
                pageControls.innerHTML = `
                    <button type="button" id="prev-page-btn" class="page-btn" title="Pagina anterior">
                        <i class="fas fa-chevron-left" aria-hidden="true"></i>
                    </button>
                    <span id="page-counter">1 / 1</span>
                    <button type="button" id="next-page-btn" class="page-btn" title="Pagina siguiente">
                        <i class="fas fa-chevron-right" aria-hidden="true"></i>
                    </button>
                `;
                container.parentElement.insertBefore(pageControls, container);
            }
        }

        // Event listeners
        const toggleBtn = document.getElementById('reading-mode-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleReadingMode);
        }

        const prevBtn = document.getElementById('prev-page-btn');
        const nextBtn = document.getElementById('next-page-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', prevPage);
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', nextPage);
        }

        // Atajos de teclado
        document.addEventListener('keydown', function(e) {
            if (currentReadingMode !== 'paginated') return;

            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                prevPage();
            } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                nextPage();
            }
        });

        updateReadingModeUI();
    }

    // Exponer funciones globales para los controles
    window.GrandielChapter = {
        toggleReadingMode,
        nextPage,
        prevPage,
        setReadingMode
    };
})();
