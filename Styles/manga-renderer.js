/**
 * Manga Renderer - Renderiza dinamicamente las paginas de manga
 * Uso: manga.html?id=nano-machine
 */

(function() {
    'use strict';

    // Obtener el ID del manga desde la URL
    const urlParams = new URLSearchParams(window.location.search);
    const mangaId = urlParams.get('id');

    if (!mangaId) {
        showError('No se especifico un manga');
        return;
    }

    // Cargar los datos del manga
    loadMangaData();

    async function loadMangaData() {
        try {
            const response = await fetch('/data/mangas.json');
            if (!response.ok) {
                throw new Error('Error al cargar los datos');
            }

            const data = await response.json();
            const manga = data.mangas.find(m => m.id === mangaId);

            if (!manga) {
                showError('Manga no encontrado: ' + mangaId);
                return;
            }

            renderManga(manga);
        } catch (error) {
            console.error('Error:', error);
            showError('Error al cargar el manga');
        }
    }

    function renderManga(manga) {
        const baseUrl = 'https://grandielscan.com';

        // Actualizar titulo de la pagina
        document.getElementById('page-title').textContent = `${manga.title} - Grandiel Scan | Leer Online`;

        // Actualizar meta tags
        const description = `Lee ${manga.title} en espanol en Grandiel Scan. ${manga.description.substring(0, 150)}...`;
        document.getElementById('meta-description').content = description;
        document.getElementById('meta-keywords').content = `${manga.title}, ${manga.title} espanol, manhwa ${manga.title}, leer ${manga.title}`;

        // Open Graph
        document.getElementById('og-url').content = `${baseUrl}/manga.html?id=${manga.id}`;
        document.getElementById('og-title').content = `${manga.title} - Grandiel Scan`;
        document.getElementById('og-description').content = description;
        document.getElementById('og-image').content = manga.image;

        // Twitter
        document.getElementById('twitter-url').content = `${baseUrl}/manga.html?id=${manga.id}`;
        document.getElementById('twitter-title').content = `${manga.title} - Grandiel Scan`;
        document.getElementById('twitter-description').content = description;
        document.getElementById('twitter-image').content = manga.image;

        // Contenido principal
        const coverImg = document.getElementById('manga-cover');
        coverImg.src = manga.image;
        coverImg.alt = `Portada de ${manga.title}`;

        document.getElementById('manga-title').textContent = manga.title;
        document.getElementById('manga-description').textContent = manga.description;

        // Info adicional
        document.getElementById('manga-type').textContent = manga.type || 'Manhwa';
        document.getElementById('manga-status').textContent = manga.status || 'En Emision';
        document.getElementById('manga-genres').textContent = (manga.genres || []).join(', ');

        // Generar lista de capitulos
        renderChapters(manga);

        // Actualizar Schema.org markup
        updateSchema(manga);
    }

    function renderChapters(manga) {
        const container = document.getElementById('chapters-container');
        const chapters = manga.chapters || [];

        if (chapters.length === 0) {
            container.innerHTML = '<p style="color: #888; text-align: center;">No hay capitulos disponibles</p>';
            return;
        }

        // Ordenar capitulos
        const sortedChapters = [...chapters].sort((a, b) => a - b);

        // Dividir en grupos de 10 para mejor organizacion visual
        const chunkSize = 10;
        let html = '';

        for (let i = 0; i < sortedChapters.length; i += chunkSize) {
            const chunk = sortedChapters.slice(i, i + chunkSize);
            html += '<div>';
            chunk.forEach(chapterNum => {
                html += `<a href="/chapter.html?manga=${manga.id}&cap=${chapterNum}">
                    <span class="chapter-title">Capitulo ${chapterNum}</span>
                </a>`;
            });
            html += '</div>';
        }

        container.innerHTML = html;
    }

    function updateSchema(manga) {
        const schema = {
            "@context": "https://schema.org",
            "@type": "ComicSeries",
            "name": manga.title,
            "url": `https://grandielscan.com/manga.html?id=${manga.id}`,
            "description": manga.description,
            "image": manga.image,
            "genre": manga.genres || [],
            "publisher": {
                "@type": "Organization",
                "name": "Grandiel Scan"
            },
            "inLanguage": "es"
        };

        document.getElementById('schema-markup').textContent = JSON.stringify(schema, null, 2);
    }

    function showError(message) {
        const pageTitle = document.getElementById('page-title');
        const mangaTitle = document.getElementById('manga-title');
        const mangaDescription = document.getElementById('manga-description');
        const mangaCover = document.getElementById('manga-cover');
        const mangaInfo = document.getElementById('manga-info');
        const chaptersContainer = document.getElementById('chapters-container');

        if (pageTitle) pageTitle.textContent = 'Error - Grandiel Scan';
        if (mangaTitle) mangaTitle.textContent = 'Error';
        if (mangaDescription) mangaDescription.textContent = message;
        if (mangaCover) mangaCover.style.display = 'none';
        if (mangaInfo) mangaInfo.style.display = 'none';
        if (chaptersContainer) {
            chaptersContainer.innerHTML = `
                <p style="color: #ff6b6b; text-align: center;">${message}</p>
                <p style="text-align: center; margin-top: 20px;">
                    <a href="/Mangas.html" style="color: #4dabf7;">Volver al catalogo</a>
                </p>
            `;
        }
    }
})();
