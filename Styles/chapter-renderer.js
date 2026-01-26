/**
 * Chapter Renderer - Renderiza dinamicamente las paginas de capitulos
 * Uso: chapter.html?manga=nano-machine&cap=1
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

        let html = '';
        pages.forEach((page, index) => {
            const imageUrl = chapter.baseUrl + page;
            html += `<img src="${imageUrl}" alt="${mangaData.title} Capitulo ${chapterNum} - Pagina ${index + 1}" loading="lazy" style="min-height: initial;">`;
        });

        container.innerHTML = html;

        // Agregar manejo de errores para imagenes
        container.querySelectorAll('img').forEach(img => {
            img.addEventListener('error', function() {
                this.style.display = 'none';
                console.warn('Error cargando imagen:', this.src);
            });
        });
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
})();
