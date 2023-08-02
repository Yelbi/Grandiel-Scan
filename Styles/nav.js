function cargarEncabezado() {
    const navContainer = document.getElementById("navContainer");

    fetch("/nav.html")
    .then(response => response.text())
    .then(html => {
        console.log("funciona");
        navContainer.innerHTML = html;
    })
    .catch(error => {
        console.error("Error al cargar el encabezdo:", error);
    });
}
cargarEncabezado();

document.addEventListener("DOMContentLoaded", cargarEncabezado);