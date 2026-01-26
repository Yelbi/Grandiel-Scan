/**
 * busqueda.js - Sistema de busqueda legacy
 * Grandiel Scan
 *
 * Corregido: Variables con const/let, null checks
 */

(function() {
    'use strict';

    // Verificar que los elementos existen antes de agregar listeners
    const iconSearch = document.getElementById("icon-search");
    const coverSearch = document.getElementById("cover-ctn-search");

    if (iconSearch) {
        iconSearch.addEventListener("click", mostrar_buscador);
    }
    if (coverSearch) {
        coverSearch.addEventListener("click", ocultar_buscador);
    }

    // Variables del buscador con const
    const bars_search = document.getElementById("ctn-bars-search");
    const cover_ctn_search = document.getElementById("cover-ctn-search");
    const inputSearch = document.getElementById("inputSearch");
    const box_search = document.getElementById("box-search");

    function mostrar_buscador() {
        if (!cover_ctn_search || !inputSearch || !box_search) return;

        cover_ctn_search.style.display = "block";
        inputSearch.focus();

        if (inputSearch.value === "") {
            box_search.style.display = "none";
        }
    }

    function ocultar_buscador() {
        if (!cover_ctn_search || !inputSearch || !box_search) return;

        cover_ctn_search.style.display = "none";
        inputSearch.value = "";
        box_search.style.display = "none";
    }

    // Agregar listener de busqueda con null check
    if (inputSearch) {
        inputSearch.addEventListener("keyup", buscador_interno);
    }

    function buscador_interno() {
        if (!inputSearch || !box_search) return;

        const filter = inputSearch.value.toUpperCase();
        const li = box_search.getElementsByTagName("li");

        for (let i = 0; i < li.length; i++) {
            const a = li[i].getElementsByTagName("a")[0];
            if (!a) continue;

            const textValue = a.textContent || a.innerText;

            if (textValue.toUpperCase().indexOf(filter) > -1) {
                li[i].style.display = "";
                box_search.style.display = "block";

                if (inputSearch.value === "") {
                    box_search.style.display = "none";
                }
            } else {
                li[i].style.display = "none";
            }
        }
    }

    // Auto-ocultar resultados con null checks
    if (bars_search && box_search) {
        let hideTimeout;

        bars_search.addEventListener('mouseleave', () => {
            hideTimeout = setTimeout(() => {
                if (!bars_search.matches(':hover')) {
                    box_search.style.display = 'none';
                }
            }, 100);
        });

        bars_search.addEventListener('mouseenter', () => {
            clearTimeout(hideTimeout);
        });

        bars_search.addEventListener('click', () => {
            box_search.style.display = 'block';
        });
    }
})();
