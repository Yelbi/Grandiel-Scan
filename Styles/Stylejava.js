window.addEventListener('scroll', function() {
    const progressBar = document.getElementById('progress-bar');
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (window.pageYOffset / totalHeight) * 100;
    progressBar.style.width = progress + '%';
  });

document.addEventListener('DOMContentLoaded', sortList('lista', 'asc'));

function cambiarI() {
  var icono = document.getElementById("cambiarIcono");
  var cambiar = true;

  if (icono.src.endsWith('/iconos/Z-A.png')) {
  icono.src = '/iconos/A-Z.png';
  sortList('lista', 'asc')
  icono.alt = 'A-Z';
  cambiar = true;
  
  } else {
  icono.src = '/iconos/Z-A.png';
  sortList('lista', 'desc')
  icono.alt = 'Z-A';
  cambiar = false;
  }
}
function sortList(id, order) {
      var ul = document.getElementById(id);
      var lis = Array.prototype.slice.call(ul.getElementsByTagName('li'));
    
      lis.sort(function(a, b) {
        var aValue = a.textContent || a.innerText;
        var bValue = b.textContent || b.innerText;
    
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
    
      for (var i = 0; i < lis.length; i++) {
        ul.appendChild(lis[i]);
      }
    }