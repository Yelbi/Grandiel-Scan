/**
 * actualizaciones.js - Página de Actualizaciones
 * Grandiel Scan
 *
 * Carga los mangas desde mangas.json ordenados por lastUpdated (más reciente primero)
 * y los renderiza con el número del último capítulo y fecha relativa.
 */

(function () {
    'use strict';

    const container = document.getElementById('actualizaciones-container');
    const sortAscBtn = document.getElementById('sort-asc-btn');
    const sortDescBtn = document.getElementById('sort-desc-btn');

    if (!container) return;

    let mangasData = [];
    let sortOrder = 'desc'; // desc = más reciente primero

    /**
     * Devuelve una fecha relativa en español (ej: "hace 2 días")
     */
    function fechaRelativa(dateStr) {
        if (!dateStr) return 'Fecha desconocida';
        const fecha = new Date(dateStr);
        const ahora = new Date();
        const diffMs = ahora - fecha;
        const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDias === 0) return 'Hoy';
        if (diffDias === 1) return 'Ayer';
        if (diffDias < 7) return `Hace ${diffDias} días`;
        if (diffDias < 30) return `Hace ${Math.floor(diffDias / 7)} semanas`;
        if (diffDias < 365) return `Hace ${Math.floor(diffDias / 30)} meses`;
        return `Hace ${Math.floor(diffDias / 365)} años`;
    }

    /**
     * Renderiza la lista de actualizaciones
     */
    function renderActualizaciones(mangas, order) {
        const sorted = [...mangas].sort((a, b) => {
            const dateA = new Date(a.lastUpdated || '2025-01-01');
            const dateB = new Date(b.lastUpdated || '2025-01-01');
            return order === 'desc' ? dateB - dateA : dateA - dateB;
        });

        const fragment = document.createDocumentFragment();

        sorted.forEach(manga => {
            const li = document.createElement('li');
            const lastCap = manga.latestChapter || (manga.chapters && manga.chapters.length ? Math.max(...manga.chapters) : 1);
            const chapterUrl = `/chapter.html?manga=${manga.id}&cap=${lastCap}`;
            const mangaUrl = `/manga.html?id=${manga.id}`;

            li.innerHTML = `
                <a href="${mangaUrl}" aria-label="Ver ${manga.title}">
                    <div>
                        <img src="${manga.image}" alt="${manga.title}" width="230" height="350" loading="lazy"
                             onerror="this.src='/img/logo.gif'">
                        <h3>${manga.title}</h3>
                        <div class="update-info">
                            <a href="${chapterUrl}" class="cap-link" aria-label="Leer capítulo ${lastCap} de ${manga.title}">
                                Cap. ${lastCap}
                            </a>
                            <span class="update-date">${fechaRelativa(manga.lastUpdated)}</span>
                        </div>
                    </div>
                </a>`;
            fragment.appendChild(li);
        });

        container.innerHTML = '';
        container.appendChild(fragment);
    }

    // Cargar datos
    async function init() {
        container.innerHTML = '<li class="loading-placeholder">Cargando actualizaciones...</li>';

        try {
            const response = await fetch('/data/mangas.json');
            if (!response.ok) throw new Error('Error al cargar mangas');
            const data = await response.json();
            mangasData = data.mangas;
            renderActualizaciones(mangasData, sortOrder);
        } catch (error) {
            console.error('[Actualizaciones] Error:', error);
            container.innerHTML = '<li class="error-state">Error al cargar. <a href="/Mangas.html">Ver catálogo</a></li>';
        }
    }

    // Botones de ordenamiento
    if (sortAscBtn) {
        sortAscBtn.addEventListener('click', function () {
            sortOrder = 'asc';
            renderActualizaciones(mangasData, sortOrder);
        });
    }
    if (sortDescBtn) {
        sortDescBtn.addEventListener('click', function () {
            sortOrder = 'desc';
            renderActualizaciones(mangasData, sortOrder);
        });
    }

    init();
})();
