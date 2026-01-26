/**
 * gene.js - Menu de generos desplegable
 * Grandiel Scan
 *
 * Corregido: Null checks, constantes con nombres descriptivos
 */

(function() {
    'use strict';

    const GENE_EXPANDED_HEIGHT = '870px';
    const GENE_COLLAPSED_HEIGHT = '50px';

    const geneElement = document.querySelector('.gene');
    const geneContentElement = document.querySelector('.gene__content');
    const increaseHeightBtn = document.querySelector('.gene__btn');

    // Solo agregar event listener si el elemento existe
    if (increaseHeightBtn && geneElement && geneContentElement) {
        increaseHeightBtn.addEventListener('click', () => {
            const currentHeight = parseFloat(geneElement.style.height) || 0;

            if (currentHeight === 870) {
                geneElement.style.height = GENE_COLLAPSED_HEIGHT;
                geneContentElement.style.height = '0px';
            } else {
                geneElement.style.height = GENE_EXPANDED_HEIGHT;
                geneContentElement.style.height = GENE_EXPANDED_HEIGHT;
            }
        });
    }
})();
