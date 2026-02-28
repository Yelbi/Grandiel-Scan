/**
 * Manga Renderer - Renderiza dinamicamente las paginas de manga
 * Uso: manga.html?id=nano-machine
 */

(function () {
    'use strict';

    const urlParams = new URLSearchParams(window.location.search);
    const mangaId = urlParams.get('id');

    if (!mangaId) {
        showError('No se especifico un manga');
        return;
    }

    loadMangaData();

    async function loadMangaData() {
        try {
            const response = await fetch('/data/mangas.json');
            if (!response.ok) throw new Error('Error al cargar los datos');

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

        // Titulo de la pagina
        document.getElementById('page-title').textContent = `${manga.title} - Grandiel Scan | Leer Online`;

        // Meta tags
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

        // Portada
        const coverImg = document.getElementById('manga-cover');
        coverImg.src = manga.image;
        coverImg.alt = `Portada de ${manga.title}`;

        // Titulo
        document.getElementById('manga-title').textContent = manga.title;

        // Boton de favorito
        renderFavoriteButton(manga);

        // Descripcion
        document.getElementById('manga-description').textContent = manga.description;

        // Info (tipo, estado, generos)
        renderInfo(manga);

        // Capitulos
        renderChapters(manga);

        // Schema.org
        updateSchema(manga, baseUrl);
    }

    function renderFavoriteButton(manga) {
        const container = document.getElementById('manga-favorite-container');
        if (!container) return;

        const isFav = isFavorite(manga.id);

        container.innerHTML = `
            <button class="manga-fav-btn ${isFav ? 'manga-fav-btn--active' : ''}"
                    data-favorite-toggle
                    data-manga-id="${manga.id}"
                    aria-label="${isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}"
                    aria-pressed="${isFav}">
                <i class="fas fa-heart" aria-hidden="true"></i>
                <span class="manga-fav-btn__label">${isFav ? 'En favoritos' : 'Favorito'}</span>
            </button>
        `;

        const btn = container.querySelector('.manga-fav-btn');
        btn.addEventListener('click', function () {
            toggleFavorite(manga.id, this);
        });
    }

    function renderInfo(manga) {
        const infoEl = document.getElementById('manga-info');
        if (!infoEl) return;

        const type = manga.type || 'Manhwa';
        const status = manga.status || 'En Emision';
        const genres = manga.genres || [];

        infoEl.innerHTML = `
            <div class="manga-badges">
                <span class="manga-badge manga-badge--type">${type}</span>
                <span class="manga-badge manga-badge--status ${status === 'Completado' ? 'manga-badge--done' : 'manga-badge--ongoing'}">${status}</span>
            </div>
            <div class="manga-genres" aria-label="Generos">
                ${genres.map(g => `<span class="manga-genre-tag">${g}</span>`).join('')}
            </div>
        `;
    }

    function renderChapters(manga) {
        const container = document.getElementById('chapters-container');
        const chapters = manga.chapters || [];

        if (chapters.length === 0) {
            container.innerHTML = '<p class="no-chapters">No hay capitulos disponibles</p>';
            return;
        }

        // Ordenar descendente (mas reciente primero)
        const sorted = [...chapters].sort((a, b) => b - a);

        // Detectar ultimo capitulo leido (usa grandiel-history igual que HistoryStorage)
        let lastRead = null;
        try {
            const history = JSON.parse(localStorage.getItem('grandiel-history') || '[]');
            const entry = history.find(h => h.mangaId === manga.id);
            if (entry) {
                lastRead = entry.chapter;
            }
        } catch (e) { /* ignorar */ }

        const chaptersHTML = sorted.map(chapterNum => {
            const isLastRead = lastRead === chapterNum;
            return `
                <div class="cap${isLastRead ? ' cap--last-read' : ''}">
                    <a href="/chapter.html?manga=${manga.id}&cap=${chapterNum}">
                        <span class="chapter-title">Capitulo ${chapterNum}</span>
                        ${isLastRead ? '<span class="chapter-badge">Ultimo leido</span>' : ''}
                        <i class="fas fa-chevron-right" aria-hidden="true"></i>
                    </a>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="chapters-header">
                <span class="chapters-count">${chapters.length} ${chapters.length === 1 ? 'capitulo' : 'capitulos'}</span>
            </div>
            <div class="chapters-list">
                ${chaptersHTML}
            </div>
        `;
    }

    function updateSchema(manga, baseUrl) {
        const schema = {
            "@context": "https://schema.org",
            "@type": "ComicSeries",
            "name": manga.title,
            "url": `${baseUrl}/manga.html?id=${manga.id}`,
            "description": manga.description,
            "image": manga.image,
            "genre": manga.genres || [],
            "publisher": {
                "@type": "Organization",
                "name": "Grandiel Scan"
            },
            "inLanguage": "es"
        };

        const schemaEl = document.getElementById('schema-markup');
        if (schemaEl) {
            schemaEl.textContent = JSON.stringify(schema, null, 2);
        }
    }

    // ===== FAVORITOS =====

    function getFavorites() {
        try {
            return JSON.parse(localStorage.getItem('grandiel-favorites') || '[]');
        } catch (e) {
            return [];
        }
    }

    function saveFavorites(favs) {
        try {
            localStorage.setItem('grandiel-favorites', JSON.stringify(favs));
        } catch (e) { /* ignorar */ }
    }

    function isFavorite(id) {
        return getFavorites().includes(id);
    }

    function toggleFavorite(mangaId, btn) {
        const favs = getFavorites();
        const idx = favs.indexOf(mangaId);
        const adding = idx === -1;

        if (adding) {
            favs.unshift(mangaId);
        } else {
            favs.splice(idx, 1);
        }

        saveFavorites(favs);

        // Actualizar UI del boton
        btn.classList.toggle('manga-fav-btn--active', adding);
        btn.setAttribute('aria-label', adding ? 'Quitar de favoritos' : 'Agregar a favoritos');
        btn.setAttribute('aria-pressed', adding);
        const label = btn.querySelector('.manga-fav-btn__label');
        if (label) label.textContent = adding ? 'En favoritos' : 'Favorito';

        // Disparar evento para sincronizar con el sistema de favoritos de main.js
        window.dispatchEvent(new CustomEvent('grandiel:favorite-toggle', {
            detail: { mangaId, action: adding ? 'add' : 'remove' }
        }));
    }

    // ===== ERROR =====

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
