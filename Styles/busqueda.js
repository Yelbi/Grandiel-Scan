document.getElementById("icon-search").addEventListener("click", mostrar_buscador);
document.getElementById("cover-ctn-search").addEventListener("click", ocultar_buscador);


bars_search =       document.getElementById("ctn-bars-search");
cover_ctn_search =  document.getElementById("cover-ctn-search");
inputSearch =       document.getElementById("inputSearch");
box_search =        document.getElementById("box-search");

function mostrar_buscador(){

    cover_ctn_search.style.display = "block";
    inputSearch.focus();

    if (inputSearch.value === ""){
        box_search.style.display = "none";
    }

}

function ocultar_buscador(){

    cover_ctn_search.style.display = "none";
    inputSearch.value = "";
    box_search.style.display = "none";

}

document.getElementById("inputSearch").addEventListener("keyup", buscador_interno);

function buscador_interno(){


    filter = inputSearch.value.toUpperCase();
    li = box_search.getElementsByTagName("li");

    for (i = 0; i < li.length; i++){

        a = li[i].getElementsByTagName("a")[0];
        textValue = a.textContent || a.innerText;

        if(textValue.toUpperCase().indexOf(filter) > -1){

            li[i].style.display = "";
            box_search.style.display = "block";

            if (inputSearch.value === ""){
                box_search.style.display = "none";
            }

        }else{
            li[i].style.display = "none";
        }
    }
}

const ctnBarsSearch = document.getElementById('ctn-bars-search');
const boxSearch = document.getElementById('box-search');
let hideTimeout;

ctnBarsSearch.addEventListener('mouseleave', () => {
  hideTimeout = setTimeout(() => {
    if (!ctnBarsSearch.matches(':hover')) {
      boxSearch.style.display = 'none';
    }
  }, 100);
});

ctnBarsSearch.addEventListener('mouseenter', () => {
  clearTimeout(hideTimeout);
});

ctnBarsSearch.addEventListener('click', () => {
  boxSearch.style.display = 'block';
});

