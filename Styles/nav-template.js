/**
 * Sistema de templates para navegación - Grandiel Scan
 * Permite inyectar la navegación completa dinámicamente
 */

// Configuración de navegación
const navConfig = {
    logo: {
        src: '/img/logo.gif',
        alt: 'Grandiel Scan Logo',
        href: '/index.html',
        width: 120
    },
    menuItems: [
        { text: 'Mangas', href: '/Mangas.html', id: 'mangas' },
        { text: 'Actualizaciones', href: '/Actualizaciones.html', id: 'actualizaciones' },
        { text: 'Nuevos', href: '/Nuevos.html', id: 'nuevos' }
    ],
    search: {
        placeholder: '¿Qué deseas buscar?',
        ariaLabel: 'Buscador de manhwas'
    }
};

// Lista de mangas (importada de nav.js)
const mangaList = [
    { title: "Nano Machine", url: "/Mangas/Nano machine.html" },
    { title: "Nueva Vida del Jugador", url: "/Mangas/Nueva Vida del Jugador.html" },
    { title: "+99 Palo de Madera", url: "/Mangas/+99 palo de madera.html" },
    { title: "World's Apocalipse Online", url: "/Mangas/world's apocalipse online.html" },
    { title: "Como Pelear", url: "/Mangas/Como pelear.html" },
    { title: "Existencia", url: "/Mangas/Existencia.html" },
    { title: "El Regreso del Demonio Loco", url: "/Mangas/el regreso del demonio loco.html" },
    { title: "Mi Vida Escolar Pretendiendo Ser una Persona Inutil", url: "/Mangas/mi vida escolar pretendiendo ser una persona inutil.html" },
    { title: "Pick Me Up, Gacha Infinito", url: "/Mangas/pick me up, gacha infinito.html" },
    { title: "El Hijo Menor del Renombrado Clan Magico", url: "/Mangas/el hijo menor del renombrado clan magico.html" },
    { title: "Cultivator Against Hero Society", url: "/Mangas/cultivator against hero society.html" },
    { title: "Artes Marciales Globales", url: "/Mangas/artes marciales globales.html" },
    { title: "De un Simple Soldado a Monarca", url: "/Mangas/de un simple soldado a monarca.html" },
    { title: "Dead Life", url: "/Mangas/dead life.html" },
    { title: "El Comerciante del Tiempo", url: "/Mangas/el comerciante del tiempo.html" },
    { title: "Druida de la Estacion de Seul", url: "/Mangas/druida de la estacion de seul.html" },
    { title: "El Hijo Menor del Maestro de la Espada", url: "/Mangas/el hijo menor del maestro de la espada.html" },
    { title: "El Demonio Celestial Instructor", url: "/Mangas/el demonio celestial instructor.html" },
    { title: "El Jugador que no Puede Subir de Nivel", url: "/Mangas/el jugador que no puede subir de nivel.html" },
    { title: "El Maestro Debil", url: "/Mangas/el maestro debil.html" },
    { title: "Maldita Reencarnacion", url: "/Mangas/maldita reencarnacion.html" },
    { title: "Jugador que Regreso 10.000 Años Despues", url: "/Mangas/jugador que regreso 10.000 años despues.html" },
    { title: "Jugador a Partir de Hoy", url: "/Mangas/jugador a partir de hoy.html" },
    { title: "Dungeon Reset", url: "/Mangas/dungeon reset.html" },
    { title: "Supremacia de las Misiones", url: "/Mangas/supremacia de las misiones.html" },
    { title: "Player", url: "/Mangas/Player.html" },
    { title: "Novato Solo a Nivel Máximo", url: "/Mangas/Novato Solo a Nivel Máximo.html" },
    { title: "El Mejor Ingeniero del Mundo", url: "/Mangas/El Mejor Ingeniero del Mundo.html" },
    { title: "Espada de la inquisición celestial", url: "/Mangas/Espada de la inquisición celestial.html" },
    { title: "El Regreso del Héroe de Clase Desastre", url: "/Mangas/El regreso del héroe de clase Desastre.html" }
];

/**
 * Genera el HTML de la navegación completa
 * @param {Object} options - Opciones de configuración
 * @param {string} options.currentPage - ID de la página actual para marcar como activa
 * @param {boolean} options.includeHr - Si incluir la línea horizontal después del nav
 * @returns {string} HTML de la navegación
 */
function generateFullNavigation(options = {}) {
    const { currentPage = '', includeHr = true } = options;

    // Generar items del menú principal
    const menuItemsHTML = navConfig.menuItems.map(item => {
        const isActive = currentPage === item.id;
        const ariaCurrent = isActive ? ' aria-current="page"' : '';
        return `<li><a href="${item.href}"${ariaCurrent}><span>${item.text}</span></a></li>`;
    }).join('\n            ');

    // Generar items de búsqueda
    const searchItemsHTML = mangaList.map(manga =>
        `<li><a href="${manga.url}"><i class="fas fa-search" aria-hidden="true"></i>${manga.title}</a></li>`
    ).join('\n                ');

    const navHTML = `<nav class="alpha" role="navigation" aria-label="Navegación principal">
        <div class="logo">
            <a href="${navConfig.logo.href}" aria-label="Ir a inicio">
                <img src="${navConfig.logo.src}" alt="${navConfig.logo.alt}" width="${navConfig.logo.width}">
            </a>
        </div>
        <ul class="list">
            ${menuItemsHTML}
        </ul>

        <div id="ctn-bars-search">
            <input type="text" id="inputSearch" placeholder="${navConfig.search.placeholder}" aria-label="${navConfig.search.ariaLabel}">
            <div id="ctn-icon-search" class="btn" role="button" aria-label="Botón de búsqueda" tabindex="0">
                <i class="fas fa-search" id="icon-search" aria-hidden="true"></i>
            </div>

            <ul id="box-search" role="listbox" aria-label="Resultados de búsqueda">
                ${searchItemsHTML}
            </ul>
        </div>
        <div id="cover-ctn-search"></div>
    </nav>${includeHr ? '\n    <hr class="br">' : ''}`;

    return navHTML;
}

/**
 * Inyecta la navegación en un elemento específico
 * @param {string} targetSelector - Selector CSS del elemento donde inyectar
 * @param {Object} options - Opciones de configuración (ver generateFullNavigation)
 */
function injectNavigation(targetSelector = '#nav-container', options = {}) {
    const targetElement = document.querySelector(targetSelector);

    if (!targetElement) {
        console.error(`Elemento ${targetSelector} no encontrado`);
        return;
    }

    targetElement.innerHTML = generateFullNavigation(options);
}

/**
 * Inicializa el sistema de templates de navegación
 * Auto-detecta la página actual basándose en la URL
 */
function initNavigationTemplate() {
    // Detectar página actual
    const path = window.location.pathname;
    let currentPage = '';

    if (path.includes('Mangas.html')) {
        currentPage = 'mangas';
    } else if (path.includes('Actualizaciones.html')) {
        currentPage = 'actualizaciones';
    } else if (path.includes('Nuevos.html')) {
        currentPage = 'nuevos';
    }

    // Buscar contenedor de navegación
    const navContainer = document.querySelector('#nav-container');

    if (navContainer) {
        // Si existe el contenedor, inyectar navegación
        injectNavigation('#nav-container', { currentPage });
    }
}

// Auto-inicializar si existe el contenedor
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigationTemplate);
} else {
    initNavigationTemplate();
}

// Exportar para uso externo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateFullNavigation,
        injectNavigation,
        initNavigationTemplate,
        navConfig,
        mangaList
    };
}
