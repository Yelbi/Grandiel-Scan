document.addEventListener("DOMContentLoaded", function() {

// AGREGANDO CLASE ACTIVE AL PRIMER ENLACE ====================
document.querySelector('.category_list .category_item[category="all"]').classList.add('ct_item-active');

// FILTRANDO PRODUCTOS  ============================================
var categoryItems = document.querySelectorAll('.category_item');
    categoryItems.forEach(function(item) {
    item.addEventListener('click', function() {
	var tipomanga = this.getAttribute('tipo');	
	var catProduct = this.getAttribute('category');
	var catProduct2 = this.getAttribute('category2');
    var catProduct3 = this.getAttribute('category3');

	console.log(catProduct + catProduct2 + catProduct3);

	// AGREGANDO CLASE ACTIVE AL ENLACE SELECCIONADO
	categoryItems.forEach(function(item) {
	    item.classList.remove('ct_item-active');
	});
	this.classList.add('ct_item-active');

	// OCULTANDO PRODUCTOS =========================
	var productItems = document.querySelectorAll('.product-item');
	productItems.forEach(function(item) {
	    item.style.transform = 'scale(0)';
	});

	function hideProduct() {
	productItems.forEach(function(item) {
		item.style.display = 'none';
	});
}
	setTimeout(hideProduct, 400);

	// MOSTRANDO PRODUCTOS =========================
	function showProduct() {
	var filtertipo = document.querySelectorAll('.product-item[tipo="' + tipomanga + '"]');
	var filteredItems = document.querySelectorAll('.product-item[category="' + catProduct + '"]');
	var filteredItems2 = document.querySelectorAll('.product-item[category2="' + catProduct2 + '"]');
	var filteredItems3 = document.querySelectorAll('.product-item[category3="' + catProduct3 + '"]');
	filtertipo.forEach(function(item) {
		item.style.display = 'block';
		item.style.transform = 'scale(1)';
	});
	filteredItems.forEach(function(item) {
		item.style.display = 'block';
		item.style.transform = 'scale(1)';
	});
	filteredItems2.forEach(function(item) {
		item.style.display = 'block';
		item.style.transform = 'scale(1)';
	});
	filteredItems3.forEach(function(item) {
		item.style.display = 'block';
		item.style.transform = 'scale(1)';
	});
}
	setTimeout(showProduct, 400);
    });
});

// MOSTRANDO TODOS LOS PRODUCTOS =======================
var allItems = document.querySelector('.category_item[category="all"]');
allItems.addEventListener('click', function() {
function showAll() {
	var productItems = document.querySelectorAll('.product-item');
	productItems.forEach(function(item) {
	    item.style.display = 'block';
	    item.style.transform = 'scale(1)';
	});
}
setTimeout(showAll, 400);
});
});

//--------------------------------------------------------------------------------------------------//
