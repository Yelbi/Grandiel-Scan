#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para aplicar correcciones masivas a archivos HTML de Grandiel Scan
Fase 1 del plan de mejoras
"""

import os
import re
import sys
from pathlib import Path

# Configurar encoding para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def fix_html_file(file_path):
    """Aplica todas las correcciones a un archivo HTML"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # 1. Cambiar lang="en" a lang="es"
        content = content.replace('lang="en"', 'lang="es"')

        # 2. Unificar rutas (eliminar /Pagina-Manga/)
        content = content.replace('/Pagina-Manga/', '/')

        # 3. Corregir enlace GSAP (de <link> a <script>)
        content = re.sub(
            r'<link rel="stylesheet" href="https://cdn\.jsdelivr\.net/npm/gsap@[\d.]+/dist/gsap\.min\.js">',
            '<script defer src="https://cdn.jsdelivr.net/npm/gsap@3.12.2/dist/gsap.min.js"></script>',
            content
        )

        # 4. Cambiar <h2> y <h3> dentro de <a> por <span>
        # Para h2 en navegación
        content = re.sub(
            r'<a href="([^"]+)"><h2>([^<]+)</h2></a>',
            r'<a href="\1"><span>\2</span></a>',
            content
        )

        # Para h3 en capítulos (más complejo, preservar contexto)
        content = re.sub(
            r'<a href="([^"]+)"><h3>(.*?)</h3></a>',
            r'<a href="\1"><span class="chapter-title">\2</span></a>',
            content,
            flags=re.DOTALL
        )

        # 5. Agregar aria-hidden a iconos de Font Awesome
        content = re.sub(
            r'<i class="fas? fa-([^"]+)"( id="[^"]+")?>',
            r'<i class="fas fa-\1"\2 aria-hidden="true">',
            content
        )

        # 6. Mejorar alt vacíos en imágenes (solo para imágenes sin alt)
        content = re.sub(
            r'<img ([^>]*)alt=""([^>]*)>',
            r'<img \1alt="Imagen de manhwa"\2>',
            content
        )

        # 7. Agregar loading="lazy" a imágenes que no lo tienen
        # Solo si no está ya presente y no es el logo
        def add_lazy_loading(match):
            img_tag = match.group(0)
            if 'loading=' not in img_tag and 'logo' not in img_tag.lower():
                # Insertar loading="lazy" antes del >
                return img_tag[:-1] + ' loading="lazy">'
            return img_tag

        content = re.sub(r'<img [^>]+>', add_lazy_loading, content)

        # 8. Actualizar año de copyright
        content = content.replace('© 2023 Grandiel Scan', '© 2026 Grandiel Scan')
        content = re.sub(r'<h2>© 2023 Grandiel Scan</h2>', '<p>© 2026 Grandiel Scan</p>', content)

        # 9. Corregir "Contacos" a "Contactos"
        content = content.replace('Contacos:', 'Contactos:')
        content = re.sub(r'<h2>Contacos:</h2>', '<p>Contactos:</p>', content)

        # Solo escribir si hubo cambios
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False

    except Exception as e:
        print(f"Error procesando {file_path}: {e}")
        return False

def process_directory(directory, pattern="*.html"):
    """Procesa todos los archivos HTML en un directorio"""
    path = Path(directory)
    files_processed = 0
    files_modified = 0

    for file_path in path.glob(pattern):
        files_processed += 1
        if fix_html_file(file_path):
            files_modified += 1
            print(f"[+] Modificado: {file_path.name}")
        else:
            print(f"  Sin cambios: {file_path.name}")

    return files_processed, files_modified

def main():
    """Función principal"""
    base_dir = Path(__file__).parent

    print("=" * 60)
    print("Script de Corrección Masiva de HTML - Grandiel Scan")
    print("=" * 60)
    print()

    # Procesar carpeta Mangas
    print("[*] Procesando archivos en /Mangas/...")
    mangas_dir = base_dir / "Mangas"
    if mangas_dir.exists():
        processed, modified = process_directory(mangas_dir)
        print(f"\n[OK] Mangas: {modified}/{processed} archivos modificados\n")
    else:
        print("[!] Carpeta Mangas no encontrada\n")

    # Procesar carpeta Capitulos
    print("[*] Procesando archivos en /Capitulos/...")
    capitulos_dir = base_dir / "Capitulos"
    if capitulos_dir.exists():
        processed, modified = process_directory(capitulos_dir)
        print(f"\n[OK] Capitulos: {modified}/{processed} archivos modificados\n")
    else:
        print("[!] Carpeta Capitulos no encontrada\n")

    # Procesar archivos raíz
    print("[*] Procesando archivos en raiz...")
    root_files = ["Mangas.html", "Nuevos.html"]
    root_processed = 0
    root_modified = 0

    for filename in root_files:
        file_path = base_dir / filename
        if file_path.exists():
            root_processed += 1
            if fix_html_file(file_path):
                root_modified += 1
                print(f"[+] Modificado: {filename}")
            else:
                print(f"[-] Sin cambios: {filename}")
        else:
            print(f"[!] No encontrado: {filename}")

    print(f"\n[OK] Raiz: {root_modified}/{root_processed} archivos modificados\n")

    print("=" * 60)
    print("*** Proceso completado ***")
    print("=" * 60)

if __name__ == "__main__":
    main()
