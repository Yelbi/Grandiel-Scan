#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para eliminar listas de búsqueda hardcodeadas de archivos HTML
y reemplazarlas con un contenedor vacío que será poblado dinámicamente
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

def remove_hardcoded_search_list(file_path):
    """Elimina la lista hardcodeada de búsqueda y la reemplaza con un contenedor vacío"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Patrón para encontrar <ul id="box-search"> con todo su contenido
        # Busca desde la apertura hasta el cierre, incluyendo atributos opcionales
        pattern = r'<ul id="box-search"[^>]*>.*?</ul>'

        # Reemplazo: ul vacío que será poblado por nav.js
        replacement = '<ul id="box-search" role="listbox" aria-label="Resultados de búsqueda"></ul>'

        # Realizar el reemplazo (re.DOTALL permite que . coincida con saltos de línea)
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)

        # Solo escribir si hubo cambios
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False

    except Exception as e:
        print(f"[!] Error procesando {file_path}: {e}")
        return False

def ensure_nav_script(file_path):
    """Asegura que el archivo tenga el script nav.js cargado antes de busqueda.js"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Verificar si ya tiene nav.js
        if '/Styles/nav.js' in content:
            return False

        # Encontrar la línea de busqueda.js y agregar nav.js antes
        if '<script src="/Styles/busqueda.js"></script>' in content:
            content = content.replace(
                '<script src="/Styles/busqueda.js"></script>',
                '<script src="/Styles/nav.js"></script>\n<script src="/Styles/busqueda.js"></script>'
            )
        elif '<script src="/Styles/Stylejava.js"></script>' in content:
            # Si no encuentra busqueda.js, agregar antes de Stylejava.js
            content = content.replace(
                '<script src="/Styles/Stylejava.js"></script>',
                '<script src="/Styles/nav.js"></script>\n<script src="/Styles/Stylejava.js"></script>'
            )
        else:
            # Si no encuentra ninguno, buscar antes del cierre de body
            content = content.replace(
                '</body>',
                '<script src="/Styles/nav.js"></script>\n</body>'
            )

        # Solo escribir si hubo cambios
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False

    except Exception as e:
        print(f"[!] Error procesando {file_path}: {e}")
        return False

def process_file(file_path):
    """Procesa un archivo: elimina lista hardcodeada y asegura script nav.js"""
    modified = False

    # Paso 1: Eliminar lista hardcodeada
    if remove_hardcoded_search_list(file_path):
        print(f"[+] Lista de busqueda eliminada: {file_path.name}")
        modified = True

    # Paso 2: Asegurar que tenga nav.js
    if ensure_nav_script(file_path):
        print(f"[+] Script nav.js agregado: {file_path.name}")
        modified = True

    if not modified:
        print(f"[-] Sin cambios: {file_path.name}")

    return modified

def process_directory(directory, pattern="*.html"):
    """Procesa todos los archivos HTML en un directorio"""
    path = Path(directory)
    files_processed = 0
    files_modified = 0

    for file_path in path.glob(pattern):
        files_processed += 1
        if process_file(file_path):
            files_modified += 1

    return files_processed, files_modified

def main():
    """Función principal"""
    base_dir = Path(__file__).parent

    print("=" * 60)
    print("Script de Eliminacion de Codigo Duplicado - Grandiel Scan")
    print("=" * 60)
    print()
    print("[*] Este script eliminara las listas de busqueda hardcodeadas")
    print("[*] y las reemplazara con carga dinamica via nav.js")
    print()

    total_processed = 0
    total_modified = 0

    # Procesar archivos raíz
    print("[*] Procesando archivos en raiz...")
    root_files = ["index.html", "Mangas.html", "Nuevos.html", "Actualizaciones.html"]

    for filename in root_files:
        file_path = base_dir / filename
        if file_path.exists():
            total_processed += 1
            if process_file(file_path):
                total_modified += 1
        else:
            print(f"[!] No encontrado: {filename}")

    print()

    # Procesar carpeta Mangas
    print("[*] Procesando archivos en /Mangas/...")
    mangas_dir = base_dir / "Mangas"
    if mangas_dir.exists():
        processed, modified = process_directory(mangas_dir)
        total_processed += processed
        total_modified += modified
        print(f"\n[OK] Mangas: {modified}/{processed} archivos modificados\n")
    else:
        print("[!] Carpeta Mangas no encontrada\n")

    # Procesar carpeta Capitulos
    print("[*] Procesando archivos en /Capitulos/...")
    capitulos_dir = base_dir / "Capitulos"
    if capitulos_dir.exists():
        processed, modified = process_directory(capitulos_dir)
        total_processed += processed
        total_modified += modified
        print(f"\n[OK] Capitulos: {modified}/{processed} archivos modificados\n")
    else:
        print("[!] Carpeta Capitulos no encontrada\n")

    print("=" * 60)
    print(f"[OK] Total: {total_modified}/{total_processed} archivos modificados")
    print("=" * 60)
    print()
    print("[*] Ahora las listas de busqueda se generan dinamicamente")
    print("[*] desde /Styles/nav.js - sin codigo duplicado!")
    print()

if __name__ == "__main__":
    main()
