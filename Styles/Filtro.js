/**
 * Filtro.js - Sistema de filtrado por categoria
 * Grandiel Scan
 *
 * Corregido: Null checks, const/let, mejor estructura
 */

document.addEventListener("DOMContentLoaded", function() {
    'use strict';

    // Agregar clase active al primer enlace (con null check)
    const allCategoryItem = document.querySelector('.category_list .category_item[category="all"]');
    if (allCategoryItem) {
        allCategoryItem.classList.add('ct_item-active');
    }

    // Filtrando productos
    const categoryItems = document.querySelectorAll('.category_item');
    if (categoryItems.length === 0) return;

    categoryItems.forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault();

            const tipomanga = this.getAttribute('tipo');
            const catProduct = this.getAttribute('category');
            const catProduct2 = this.getAttribute('category2');
            const catProduct3 = this.getAttribute('category3');

            // Agregar clase active al enlace seleccionado
            categoryItems.forEach(function(categoryItem) {
                categoryItem.classList.remove('ct_item-active');
            });
            this.classList.add('ct_item-active');

            // Ocultar productos
            const productItems = document.querySelectorAll('.product-item');
            productItems.forEach(function(productItem) {
                productItem.style.transform = 'scale(0)';
            });

            function hideProduct() {
                productItems.forEach(function(productItem) {
                    productItem.style.display = 'none';
                });
            }
            setTimeout(hideProduct, 400);

            // Mostrar productos filtrados
            function showProduct() {
                // Filtro por tipo
                if (tipomanga) {
                    const filtertipo = document.querySelectorAll('.product-item[tipo="' + tipomanga + '"]');
                    filtertipo.forEach(function(productItem) {
                        productItem.style.display = 'block';
                        productItem.style.transform = 'scale(1)';
                    });
                }

                // Filtro por categoria principal
                if (catProduct && catProduct !== 'all') {
                    const filteredItems = document.querySelectorAll('.product-item[category="' + catProduct + '"]');
                    filteredItems.forEach(function(productItem) {
                        productItem.style.display = 'block';
                        productItem.style.transform = 'scale(1)';
                    });
                }

                // Filtro por categoria2
                if (catProduct2) {
                    const filteredItems2 = document.querySelectorAll('.product-item[category2="' + catProduct2 + '"]');
                    filteredItems2.forEach(function(productItem) {
                        productItem.style.display = 'block';
                        productItem.style.transform = 'scale(1)';
                    });
                }

                // Filtro por categoria3
                if (catProduct3) {
                    const filteredItems3 = document.querySelectorAll('.product-item[category3="' + catProduct3 + '"]');
                    filteredItems3.forEach(function(productItem) {
                        productItem.style.display = 'block';
                        productItem.style.transform = 'scale(1)';
                    });
                }
            }
            setTimeout(showProduct, 400);
        });
    });

    // Mostrar todos los productos
    const allItems = document.querySelector('.category_item[category="all"]');
    if (allItems) {
        allItems.addEventListener('click', function() {
            function showAll() {
                const productItems = document.querySelectorAll('.product-item');
                productItems.forEach(function(productItem) {
                    productItem.style.display = 'block';
                    productItem.style.transform = 'scale(1)';
                });
            }
            setTimeout(showAll, 400);
        });
    }
});
