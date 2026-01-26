/**
 * Stylejava.js - Funciones de utilidad
 * Grandiel Scan
 *
 * Corregido: Callback fix, null checks, const/let
 */

(function() {
    'use strict';

    // Progress bar con null check
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        window.addEventListener('scroll', function() {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (totalHeight > 0) {
                const progress = (window.pageYOffset / totalHeight) * 100;
                progressBar.style.width = progress + '%';
            }
        });
    }

    // Ejecutar sortList cuando el DOM este listo (corregido: arrow function como callback)
    document.addEventListener('DOMContentLoaded', function() {
        const lista = document.getElementById('lista');
        if (lista) {
            sortList('lista', 'asc');
        }
    });

    // Funcion global para cambiar icono de ordenamiento
    window.cambiarI = function() {
        const icono = document.getElementById("cambiarIcono");
        if (!icono) return;

        if (icono.src.endsWith('/iconos/Z-A.png')) {
            icono.src = '/iconos/A-Z.png';
            sortList('lista', 'asc');
            icono.alt = 'A-Z';
        } else {
            icono.src = '/iconos/Z-A.png';
            sortList('lista', 'desc');
            icono.alt = 'Z-A';
        }
    };

    // Agregar event listener al boton de ordenamiento
    const sortBtn = document.getElementById('cambiarIcono-btn');
    if (sortBtn) {
        sortBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.cambiarI();
        });
    }

    // Event listeners para botones de ordenamiento en Actualizaciones.html
    const sortAscBtn = document.getElementById('sort-asc-btn');
    const sortDescBtn = document.getElementById('sort-desc-btn');

    if (sortAscBtn) {
        sortAscBtn.addEventListener('click', function() {
            sortList('lista', 'asc');
        });
    }

    if (sortDescBtn) {
        sortDescBtn.addEventListener('click', function() {
            sortList('lista', 'desc');
        });
    }

    // Funcion global de ordenamiento
    window.sortList = function(id, order) {
        const ul = document.getElementById(id);
        if (!ul) return;

        const lis = Array.prototype.slice.call(ul.getElementsByTagName('li'));

        lis.sort(function(a, b) {
            const aValue = a.textContent || a.innerText;
            const bValue = b.textContent || b.innerText;

            if (order === 'asc') {
                if (aValue < bValue) return -1;
                if (aValue > bValue) return 1;
            } else if (order === 'desc') {
                if (aValue > bValue) return -1;
                if (aValue < bValue) return 1;
            }

            return 0;
        });

        ul.innerHTML = '';

        for (let i = 0; i < lis.length; i++) {
            ul.appendChild(lis[i]);
        }
    };
})();

// Exponer sortList globalmente para compatibilidad con Actualizaciones.html
if (typeof window.sortList === 'undefined') {
    window.sortList = function(id, order) {
        const ul = document.getElementById(id);
        if (!ul) return;

        const lis = Array.prototype.slice.call(ul.getElementsByTagName('li'));

        lis.sort(function(a, b) {
            const aValue = a.textContent || a.innerText;
            const bValue = b.textContent || b.innerText;

            if (order === 'asc') {
                return aValue.localeCompare(bValue, 'es');
            } else if (order === 'desc') {
                return bValue.localeCompare(aValue, 'es');
            }
            return 0;
        });

        ul.innerHTML = '';
        lis.forEach(li => ul.appendChild(li));
    };
}
