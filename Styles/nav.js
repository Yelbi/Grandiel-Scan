/**
 * Componente de navegacion reutilizable para Grandiel Scan
 * Este script genera la navegacion y la barra de busqueda de forma dinamica
 * Total de mangas: 69
 */

// Lista completa de mangas para la busqueda (69 mangas)
// Usa el nuevo sistema de plantillas dinamicas con URLs /manga.html?id=
const mangaList = [
    { title: "+99 Palo de Madera", url: "/manga.html?id=99-palo-de-madera" },
    { title: "Artes Marciales Globales", url: "/manga.html?id=artes-marciales-globales" },
    { title: "Blue Lock", url: "/manga.html?id=blue-lock" },
    { title: "Boku no Namae wa Shounen A", url: "/manga.html?id=boku-no-namae-wa-shounen-a" },
    { title: "Chainsaw Man", url: "/manga.html?id=chainsaw-man" },
    { title: "Como Pelear", url: "/manga.html?id=como-pelear" },
    { title: "Cronicas del Demonio Celestial", url: "/manga.html?id=cronicas-del-demonio-celestial" },
    { title: "Cultivator Against Hero Society", url: "/manga.html?id=cultivator-against-hero-society" },
    { title: "De un Simple Soldado a Monarca", url: "/manga.html?id=de-un-simple-soldado-a-monarca" },
    { title: "Dead Life", url: "/manga.html?id=dead-life" },
    { title: "Dice El Cubo que lo Cambia Todo", url: "/manga.html?id=dice-el-cubo-que-lo-cambia-todo" },
    { title: "Dorei Yuugi", url: "/manga.html?id=dorei-yuugi" },
    { title: "Druida de la Estacion de Seul", url: "/manga.html?id=druida-de-la-estacion-de-seul" },
    { title: "Dungeon Reset", url: "/manga.html?id=dungeon-reset" },
    { title: "El Boxeador", url: "/manga.html?id=el-boxeador" },
    { title: "El Chico del Diablo", url: "/manga.html?id=el-chico-del-diablo" },
    { title: "El Comerciante del Tiempo", url: "/manga.html?id=el-comerciante-del-tiempo" },
    { title: "El Demonio Celestial Instructor", url: "/manga.html?id=el-demonio-celestial-instructor" },
    { title: "El Heroe ha Regresado", url: "/manga.html?id=el-heroe-ha-regresado" },
    { title: "El Hijo Menor del Maestro de la Espada", url: "/manga.html?id=el-hijo-menor-del-maestro-de-la-espada" },
    { title: "El Hijo Menor del Renombrado Clan Magico", url: "/manga.html?id=el-hijo-menor-del-renombrado-clan-magico" },
    { title: "El Jugador que no Puede Subir de Nivel", url: "/manga.html?id=el-jugador-que-no-puede-subir-de-nivel" },
    { title: "El Maestro Debil", url: "/manga.html?id=el-maestro-debil" },
    { title: "El Mejor Ingeniero del Mundo", url: "/manga.html?id=el-mejor-ingeniero-del-mundo" },
    { title: "El Mundo Despues del Fin", url: "/manga.html?id=el-mundo-despues-del-fin" },
    { title: "El Regreso del Demonio Loco", url: "/manga.html?id=el-regreso-del-demonio-loco" },
    { title: "El Regreso del Heroe de Clase Desastre", url: "/manga.html?id=el-regreso-del-heroe-de-clase-desastre" },
    { title: "Espada de la Inquisicion Celestial", url: "/manga.html?id=espada-de-la-inquisicion-celestial" },
    { title: "Estandar de la Reencarnacion", url: "/manga.html?id=estandar-de-la-reencarnacion" },
    { title: "Existencia", url: "/manga.html?id=existencia" },
    { title: "Heroe Suicida de Clase SSS", url: "/manga.html?id=heroe-suicida-de-clase-sss" },
    { title: "Jugador a Partir de Hoy", url: "/manga.html?id=jugador-a-partir-de-hoy" },
    { title: "Jugador que Regreso 10.000 Anos Despues", url: "/manga.html?id=jugador-que-regreso-10000-anos-despues" },
    { title: "Juujika no Rokunin", url: "/manga.html?id=juujika-no-rokunin" },
    { title: "Kaiju No.8", url: "/manga.html?id=kaiju-no8" },
    { title: "La Magia de un Retornado Debe Ser Especial", url: "/manga.html?id=la-magia-de-un-retornado-debe-ser-especial" },
    { title: "La Torre Tutorial del Jugador Avanzado", url: "/manga.html?id=la-torre-tutorial-del-jugador-avanzado" },
    { title: "La Vida Despues de la Muerte", url: "/manga.html?id=la-vida-despues-de-la-muerte" },
    { title: "Maldita Reencarnacion", url: "/manga.html?id=maldita-reencarnacion" },
    { title: "Mashle", url: "/manga.html?id=mashle" },
    { title: "Mi Hija es el Jefe Final", url: "/manga.html?id=mi-hija-es-el-jefe-final" },
    { title: "Mi Vida Escolar Pretendiendo Ser una Persona Inutil", url: "/manga.html?id=mi-vida-escolar-pretendiendo-ser-una-persona-inutil" },
    { title: "Murim Login", url: "/manga.html?id=murim-login" },
    { title: "Nano Machine", url: "/manga.html?id=nano-machine" },
    { title: "Nicromante en Solitario", url: "/manga.html?id=nicromante-en-solitario" },
    { title: "Novato Solo a Nivel Maximo", url: "/manga.html?id=novato-solo-a-nivel-maximo" },
    { title: "Nueva Vida del Jugador", url: "/manga.html?id=nueva-vida-del-jugador" },
    { title: "Overgeared", url: "/manga.html?id=overgeared" },
    { title: "Pick Me Up, Gacha Infinito", url: "/manga.html?id=pick-me-up-gacha-infinito" },
    { title: "Player", url: "/manga.html?id=player" },
    { title: "Reencarne en un Pez", url: "/manga.html?id=reencarne-en-un-pez" },
    { title: "Regreso de la Secta del Monte Hua", url: "/manga.html?id=regreso-de-la-secta-del-monte-hua" },
    { title: "Segunda Vida para ser un Ranker", url: "/manga.html?id=segunda-vida-para-ser-un-ranker" },
    { title: "Shumatsu no Valkyrie", url: "/manga.html?id=shmatsu-no-valkyrie" },
    { title: "Solo Leveling", url: "/manga.html?id=solo-leveling" },
    { title: "Soul Cartel", url: "/manga.html?id=soul-cartel" },
    { title: "Subidas de Nivel Ilimitadas en Murim", url: "/manga.html?id=subidas-de-nivel-ilimitadas-en-murim" },
    { title: "Supremacia de las Misiones", url: "/manga.html?id=supremacia-de-las-misiones" },
    { title: "Tales of Demons and Gods", url: "/manga.html?id=tales-of-demons-and-gods" },
    { title: "Tensei Shitara Dai Nana Oji Dattanode", url: "/manga.html?id=tensei-shitara-dai-nana-oji-dattanode-kimama-ni-majutsu-o-kiwamemasu" },
    { title: "Tensei Shitara Slime Datta Ken", url: "/manga.html?id=tensei-shitara-slime-datta-ken" },
    { title: "The Live", url: "/manga.html?id=the-live" },
    { title: "Tokyo Ghoul", url: "/manga.html?id=tokyo-ghoul" },
    { title: "Tomodachi Game", url: "/manga.html?id=tomodachi-game" },
    { title: "Torre de Dios", url: "/manga.html?id=torre-de-dios" },
    { title: "Tu Talento Ahora es Mio", url: "/manga.html?id=tu-talento-ahora-es-mio" },
    { title: "Una Verdad Incomoda", url: "/manga.html?id=una-verdad-incomoda" },
    { title: "World's Apocalypse Online", url: "/manga.html?id=worlds-apocalipse-online" },
    { title: "ZomGan", url: "/manga.html?id=zomgan" }
];

/**
 * Genera el HTML de la navegacion
 * @param {string} currentPage - Pagina actual para marcar como activa
 */
function generateNavigation(currentPage = '') {
    const searchItems = mangaList.map(manga => `
        <li><a href="${manga.url}"><i class="fas fa-search" aria-hidden="true"></i>${manga.title}</a></li>
    `).join('');

    return `
    <nav role="navigation" aria-label="Navegacion principal" class="alpha">
        <div class="logo">
            <a href="/index.html" aria-label="Ir a inicio"><img src="/img/logo.gif" alt="Grandiel Scan Logo" width="120"></a>
        </div>
        <ul class="list">
            <li><a href="/Mangas.html" ${currentPage === 'mangas' ? 'aria-current="page"' : ''}><span>Mangas</span></a></li>
            <li><a href="/Actualizaciones.html" ${currentPage === 'actualizaciones' ? 'aria-current="page"' : ''}><span>Actualizaciones</span></a></li>
            <li><a href="/Nuevos.html" ${currentPage === 'nuevos' ? 'aria-current="page"' : ''}><span>Nuevos</span></a></li>
        </ul>

        <div id="ctn-bars-search">
            <input type="text" id="inputSearch" placeholder="Que deseas buscar?" aria-label="Buscador de manhwas">
            <div id="ctn-icon-search" class="btn" role="button" aria-label="Boton de busqueda" tabindex="0">
                <i class="fas fa-search" id="icon-search" aria-hidden="true"></i>
            </div>

            <ul id="box-search" role="listbox" aria-label="Resultados de busqueda">
                ${searchItems}
            </ul>
        </div>
        <div id="cover-ctn-search"></div>
    </nav>
    <hr class="br">
    `;
}

/**
 * Genera e inyecta dinamicamente la lista de busqueda
 * Debe llamarse cuando el DOM este listo
 */
function loadSearchList() {
    const boxSearch = document.getElementById('box-search');
    if (!boxSearch) {
        console.warn('Elemento #box-search no encontrado');
        return;
    }

    // Generar los items de busqueda
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

// Ejecutar cuando el DOM este listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSearchList);
} else {
    // DOM ya esta listo
    loadSearchList();
}

// Exportar para uso en modulos (si es necesario)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateNavigation, mangaList, loadSearchList };
}
