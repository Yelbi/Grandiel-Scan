/**
 * nuevos.js - Página de Mangas Nuevos
 * Grandiel Scan
 *
 * Carga los mangas desde mangas.json ordenados por dateAdded (más reciente primero)
 * y los renderiza dinámicamente en #nuevos-container.
 */

(async function () {
    'use strict';

    const container = document.getElementById('nuevos-container');
    if (!container) return;

    // Mostrar loading
    container.innerHTML = '<li class="loading-placeholder">Cargando mangas...</li>';

    try {
        const response = await fetch('/data/mangas.json');
        if (!response.ok) throw new Error('Error al cargar mangas');
        const data = await response.json();

        // Ordenar por dateAdded más reciente primero
        const mangas = [...data.mangas].sort((a, b) => {
            const dateA = new Date(a.dateAdded || '2025-01-01');
            const dateB = new Date(b.dateAdded || '2025-01-01');
            return dateB - dateA;
        });

        // Calcular fecha de hace 30 días para badge "NUEVO"
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Renderizar mangas
        container.innerHTML = '';
        const fragment = document.createDocumentFragment();

        mangas.forEach(manga => {
            const li = document.createElement('li');
            const isNew = manga.dateAdded && new Date(manga.dateAdded) >= thirtyDaysAgo;

            li.innerHTML = `
                <a href="/manga.html?id=${manga.id}" aria-label="Ver ${manga.title}">
                    <div style="position:relative;">
                        ${isNew ? '<span class="badge-nuevo" aria-label="Nuevo">NUEVO</span>' : ''}
                        <img src="${manga.image}" alt="Portada de ${manga.title}" width="230" height="350" loading="lazy"
                             onerror="this.src='/img/logo.gif'">
                        <h3><b>${manga.title}</b></h3>
                    </div>
                </a>`;
            fragment.appendChild(li);
        });

        container.appendChild(fragment);

    } catch (error) {
        console.error('[Nuevos] Error al cargar mangas:', error);
        container.innerHTML = '<li class="error-state">Error al cargar los mangas. <a href="/Mangas.html">Ver catálogo completo</a></li>';
    }
})();
