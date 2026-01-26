/**
 * Componente de navegación reutilizable para Grandiel Scan
 * Este script genera la navegación y la barra de búsqueda de forma dinámica
 * Total de mangas: 69
 */

// Lista completa de mangas para la búsqueda (69 mangas)
const mangaList = [
    { title: "+99 Palo de Madera", url: "/Mangas/+99 palo de madera.html" },
    { title: "Artes Marciales Globales", url: "/Mangas/artes marciales globales.html" },
    { title: "Blue Lock", url: "/Mangas/Blue Lock.html" },
    { title: "Boku no Namae wa Shounen A", url: "/Mangas/Boku no Namae wa Shounen A.html" },
    { title: "Chainsaw Man", url: "/Mangas/Chainsaw Man.html" },
    { title: "Como Pelear", url: "/Mangas/Como pelear.html" },
    { title: "Crónicas del Demonio Celestial", url: "/Mangas/Crónicas del Demonio Celestial.html" },
    { title: "Cultivator Against Hero Society", url: "/Mangas/cultivator against hero society.html" },
    { title: "De un Simple Soldado a Monarca", url: "/Mangas/de un simple soldado a monarca.html" },
    { title: "Dead Life", url: "/Mangas/dead life.html" },
    { title: "Dice El Cubo que lo Cambia Todo", url: "/Mangas/Dice El Cubo que lo Cambia Todo.html" },
    { title: "Dorei Yuugi", url: "/Mangas/Dorei Yuugi.html" },
    { title: "Druida de la Estación de Seúl", url: "/Mangas/druida de la estacion de seul.html" },
    { title: "Dungeon Reset", url: "/Mangas/dungeon reset.html" },
    { title: "El Boxeador", url: "/Mangas/El Boxeador.html" },
    { title: "El Chico del Diablo", url: "/Mangas/El Chico del Diablo.html" },
    { title: "El Comerciante del Tiempo", url: "/Mangas/el comerciante del tiempo.html" },
    { title: "El Demonio Celestial Instructor", url: "/Mangas/el demonio celestial instructor.html" },
    { title: "El Héroe ha Regresado", url: "/Mangas/El Héroe ha Regresado.html" },
    { title: "El Hijo Menor del Maestro de la Espada", url: "/Mangas/el hijo menor del maestro de la espada.html" },
    { title: "El Hijo Menor del Renombrado Clan Mágico", url: "/Mangas/el hijo menor del renombrado clan magico.html" },
    { title: "El Jugador que no Puede Subir de Nivel", url: "/Mangas/el jugador que no puede subir de nivel.html" },
    { title: "El Maestro Débil", url: "/Mangas/el maestro debil.html" },
    { title: "El Mejor Ingeniero del Mundo", url: "/Mangas/El Mejor Ingeniero del Mundo.html" },
    { title: "El Mundo Después del Fin", url: "/Mangas/El Mundo Después del Fin.html" },
    { title: "El Regreso del Demonio Loco", url: "/Mangas/el regreso del demonio loco.html" },
    { title: "El Regreso del Héroe de Clase Desastre", url: "/Mangas/El regreso del héroe de clase Desastre.html" },
    { title: "Espada de la Inquisición Celestial", url: "/Mangas/Espada de la inquisición celestial.html" },
    { title: "Estándar de la Reencarnación", url: "/Mangas/Estandar de la Reencarnacion.html" },
    { title: "Existencia", url: "/Mangas/Existencia.html" },
    { title: "Héroe Suicida de Clase SSS", url: "/Mangas/Heroe Suicida de Clase SSS.html" },
    { title: "Jugador a Partir de Hoy", url: "/Mangas/jugador a partir de hoy.html" },
    { title: "Jugador que Regresó 10.000 Años Después", url: "/Mangas/jugador que regreso 10.000 años despues.html" },
    { title: "Juujika no Rokunin", url: "/Mangas/Juujika no Rokunin.html" },
    { title: "Kaiju No.8", url: "/Mangas/Kaiju No.8.html" },
    { title: "La Magia de un Retornado Debe Ser Especial", url: "/Mangas/La Magia de un Retornado Debe Ser Especial.html" },
    { title: "La Torre Tutorial del Jugador Avanzado", url: "/Mangas/La Torre Tutorial del Jugador Avanzado.html" },
    { title: "La Vida Después de la Muerte", url: "/Mangas/La Vida Despues de la Muerte.html" },
    { title: "Maldita Reencarnación", url: "/Mangas/maldita reencarnacion.html" },
    { title: "Mashle", url: "/Mangas/Mashle.html" },
    { title: "Mi Hija es el Jefe Final", url: "/Mangas/Mi Hija es el Jefe Final.html" },
    { title: "Mi Vida Escolar Pretendiendo Ser una Persona Inútil", url: "/Mangas/mi vida escolar pretendiendo ser una persona inutil.html" },
    { title: "Murim Login", url: "/Mangas/Murim Login.html" },
    { title: "Nano Machine", url: "/Mangas/Nano machine.html" },
    { title: "Nicromante en Solitario", url: "/Mangas/Nicromante en Solitario.html" },
    { title: "Novato Solo a Nivel Máximo", url: "/Mangas/Novato Solo a Nivel Máximo.html" },
    { title: "Nueva Vida del Jugador", url: "/Mangas/Nueva Vida del Jugador.html" },
    { title: "Overgeared", url: "/Mangas/Overgeared.html" },
    { title: "Pick Me Up, Gacha Infinito", url: "/Mangas/pick me up, gacha infinito.html" },
    { title: "Player", url: "/Mangas/Player.html" },
    { title: "Reencarne en un Pez", url: "/Mangas/Reencarne en un Pez.html" },
    { title: "Regreso de la Secta del Monte Hua", url: "/Mangas/Regreso de la Secta del Monte Hua.html" },
    { title: "Segunda Vida para ser un Ranker", url: "/Mangas/Segunda Vida para ser un Ranker.html" },
    { title: "Shūmatsu no Valkyrie", url: "/Mangas/Shūmatsu no Valkyrie.html" },
    { title: "Solo Leveling", url: "/Mangas/Solo Leveling.html" },
    { title: "Soul Cartel", url: "/Mangas/Soul Cartel.html" },
    { title: "Subidas de Nivel Ilimitadas en Murim", url: "/Mangas/Subidas de Nivel Ilimitadas en Murim.html" },
    { title: "Supremacía de las Misiones", url: "/Mangas/supremacia de las misiones.html" },
    { title: "Tales of Demons and Gods", url: "/Mangas/Tales of Demons and Gods.html" },
    { title: "Tensei Shitara Dai Nana Oji Dattanode", url: "/Mangas/Tensei Shitara Dai Nana Oji Dattanode, Kimama ni Majutsu o Kiwamemasu.html" },
    { title: "Tensei Shitara Slime Datta Ken", url: "/Mangas/Tensei Shitara Slime Datta Ken.html" },
    { title: "The Live", url: "/Mangas/The Live.html" },
    { title: "Tokyo Ghoul", url: "/Mangas/Tokyo Ghoul.html" },
    { title: "Tomodachi Game", url: "/Mangas/Tomodachi Game.html" },
    { title: "Torre de Dios", url: "/Mangas/Torre de Dios.html" },
    { title: "Tu Talento Ahora es Mío", url: "/Mangas/Tu talento ahora es mio.html" },
    { title: "Una Verdad Incómoda", url: "/Mangas/Una Verdad Incómoda.html" },
    { title: "World's Apocalypse Online", url: "/Mangas/world's apocalipse online.html" },
    { title: "ZomGan", url: "/Mangas/ZomGan.html" }
];

/**
 * Genera el HTML de la navegación
 * @param {string} currentPage - Página actual para marcar como activa
 */
function generateNavigation(currentPage = '') {
    const searchItems = mangaList.map(manga => `
        <li><a href="${manga.url}"><i class="fas fa-search" aria-hidden="true"></i>${manga.title}</a></li>
    `).join('');

    return `
    <nav role="navigation" aria-label="Navegación principal" class="alpha">
        <div class="logo">
            <a href="/index.html" aria-label="Ir a inicio"><img src="/img/logo.gif" alt="Grandiel Scan Logo" width="120"></a>
        </div>
        <ul class="list">
            <li><a href="/Mangas.html" ${currentPage === 'mangas' ? 'aria-current="page"' : ''}><span>Mangas</span></a></li>
            <li><a href="/Actualizaciones.html" ${currentPage === 'actualizaciones' ? 'aria-current="page"' : ''}><span>Actualizaciones</span></a></li>
            <li><a href="/Nuevos.html" ${currentPage === 'nuevos' ? 'aria-current="page"' : ''}><span>Nuevos</span></a></li>
        </ul>

        <div id="ctn-bars-search">
            <input type="text" id="inputSearch" placeholder="¿Qué deseas buscar?" aria-label="Buscador de manhwas">
            <div id="ctn-icon-search" class="btn" role="button" aria-label="Botón de búsqueda" tabindex="0">
                <i class="fas fa-search" id="icon-search" aria-hidden="true"></i>
            </div>

            <ul id="box-search" role="listbox" aria-label="Resultados de búsqueda">
                ${searchItems}
            </ul>
        </div>
        <div id="cover-ctn-search"></div>
    </nav>
    <hr class="br">
    `;
}

/**
 * Genera e inyecta dinámicamente la lista de búsqueda
 * Debe llamarse cuando el DOM esté listo
 */
function loadSearchList() {
    const boxSearch = document.getElementById('box-search');
    if (!boxSearch) {
        console.warn('Elemento #box-search no encontrado');
        return;
    }

    // Generar los items de búsqueda
    const searchItems = mangaList.map(manga => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        const icon = document.createElement('i');

        icon.className = 'fas fa-search';
        icon.setAttribute('aria-hidden', 'true');

        a.href = manga.url;
        a.appendChild(icon);
        a.appendChild(document.createTextNode(manga.title));

        li.appendChild(a);
        return li;
    });

    // Limpiar contenido previo e insertar nuevos items
    boxSearch.innerHTML = '';
    searchItems.forEach(item => boxSearch.appendChild(item));
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSearchList);
} else {
    // DOM ya está listo
    loadSearchList();
}

// Exportar para uso en módulos (si es necesario)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateNavigation, mangaList, loadSearchList };
}
