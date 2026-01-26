#!/usr/bin/env python3
"""
Script para extraer datos de los archivos HTML existentes
y generar/actualizar los archivos JSON para el sistema de plantillas.

Uso: python extract-data.py
"""

import os
import re
import json
import sys
from pathlib import Path
from html.parser import HTMLParser

# Configurar salida UTF-8 para Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Directorios
BASE_DIR = Path(__file__).parent
MANGAS_DIR = BASE_DIR / 'Mangas'
CAPITULOS_DIR = BASE_DIR / 'Capitulos'
DATA_DIR = BASE_DIR / 'data'

# Asegurar que existe el directorio data
DATA_DIR.mkdir(exist_ok=True)


def slugify(text):
    """Convierte texto a slug para IDs"""
    text = text.lower().strip()
    # Reemplazar caracteres especiales
    replacements = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'ñ': 'n', 'ü': 'u', '+': '', "'": '', '"': '',
        '.': '', ',': ''
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    # Reemplazar espacios con guiones
    text = re.sub(r'\s+', '-', text)
    # Eliminar caracteres no alfanuméricos excepto guiones
    text = re.sub(r'[^a-z0-9-]', '', text)
    # Eliminar guiones múltiples
    text = re.sub(r'-+', '-', text)
    return text.strip('-')


class MangaHTMLParser(HTMLParser):
    """Parser para extraer datos de archivos HTML de mangas"""

    def __init__(self):
        super().__init__()
        self.title = ''
        self.description = ''
        self.image = ''
        self.chapters = []
        self.in_h1 = False
        self.in_p = False
        self.in_parrafo = False
        self.current_data = ''

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)

        if tag == 'h1':
            self.in_h1 = True
            self.current_data = ''
        elif tag == 'p' and self.in_parrafo:
            self.in_p = True
            self.current_data = ''
        elif tag == 'div':
            if attrs_dict.get('class') == 'parrafo':
                self.in_parrafo = True
        elif tag == 'img':
            src = attrs_dict.get('src', '')
            if '/img/' in src and not self.image:
                self.image = src
        elif tag == 'a':
            href = attrs_dict.get('href', '')
            if '/Capitulos/' in href or '/chapter.html' in href:
                # Extraer número de capítulo
                match = re.search(r'cap[itulo]*\s*(\d+)', href, re.IGNORECASE)
                if match:
                    cap_num = int(match.group(1))
                    if cap_num not in self.chapters:
                        self.chapters.append(cap_num)

    def handle_endtag(self, tag):
        if tag == 'h1' and self.in_h1:
            self.in_h1 = False
            if self.current_data.strip():
                self.title = self.current_data.strip()
        elif tag == 'p' and self.in_p:
            self.in_p = False
            if self.current_data.strip() and not self.description:
                self.description = self.current_data.strip()
        elif tag == 'div':
            self.in_parrafo = False

    def handle_data(self, data):
        if self.in_h1 or self.in_p:
            self.current_data += data


class ChapterHTMLParser(HTMLParser):
    """Parser para extraer datos de archivos HTML de capítulos"""

    def __init__(self):
        super().__init__()
        self.images = []
        self.manga_title = ''
        self.manga_link = ''
        self.in_sig = False
        self.in_a = False
        self.current_href = ''

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)

        if tag == 'div':
            if attrs_dict.get('class') in ['sig', 'dede']:
                self.in_sig = attrs_dict.get('class') == 'sig'
        elif tag == 'img':
            src = attrs_dict.get('src', '')
            if src.startswith('http') and 'storage/comics' in src:
                self.images.append(src)
        elif tag == 'a':
            self.in_a = True
            self.current_href = attrs_dict.get('href', '')

    def handle_endtag(self, tag):
        if tag == 'div':
            self.in_sig = False
        elif tag == 'a':
            self.in_a = False
            self.current_href = ''

    def handle_data(self, data):
        if self.in_sig and self.in_a and '/Mangas/' in self.current_href:
            if data.strip() and not self.manga_title:
                self.manga_title = data.strip()
                self.manga_link = self.current_href


def extract_manga_data(html_file):
    """Extrae datos de un archivo HTML de manga"""
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()

        parser = MangaHTMLParser()
        parser.feed(content)

        # Obtener título del nombre del archivo si no se encontró
        if not parser.title:
            parser.title = html_file.stem.replace('_', ' ').title()

        return {
            'title': parser.title,
            'description': parser.description or f'Lee {parser.title} en español en Grandiel Scan.',
            'image': parser.image,
            'chapters': sorted(parser.chapters)
        }
    except Exception as e:
        print(f'Error procesando {html_file}: {e}')
        return None


def extract_chapter_data(html_file):
    """Extrae datos de un archivo HTML de capítulo"""
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()

        parser = ChapterHTMLParser()
        parser.feed(content)

        # Extraer número de capítulo del nombre del archivo
        filename = html_file.stem
        match = re.search(r'cap[itulo]*\s*(\d+)', filename, re.IGNORECASE)
        chapter_num = int(match.group(1)) if match else 0

        # Extraer nombre del manga del nombre del archivo
        manga_name = re.sub(r'\s*cap[itulo]*\s*\d+.*$', '', filename, flags=re.IGNORECASE).strip()

        # Procesar imágenes para obtener baseUrl y páginas
        if parser.images:
            # Encontrar la base URL común
            first_image = parser.images[0]
            # Extraer la parte base de la URL
            base_match = re.match(r'(https://[^/]+/storage/comics/\d+/\d+/)', first_image)
            if base_match:
                base_url = base_match.group(1)
                pages = [img.replace(base_url, '') for img in parser.images]
            else:
                base_url = ''
                pages = parser.images
        else:
            base_url = ''
            pages = []

        return {
            'manga_name': manga_name or parser.manga_title,
            'chapter': chapter_num,
            'baseUrl': base_url,
            'pages': pages
        }
    except Exception as e:
        print(f'Error procesando {html_file}: {e}')
        return None


def main():
    print('=' * 60)
    print('Extractor de datos HTML a JSON')
    print('=' * 60)

    # Extraer datos de mangas
    print('\n--- Procesando mangas ---')
    mangas_data = []

    if MANGAS_DIR.exists():
        for html_file in sorted(MANGAS_DIR.glob('*.html')):
            print(f'Procesando: {html_file.name}')
            data = extract_manga_data(html_file)
            if data:
                manga_id = slugify(data['title'])
                mangas_data.append({
                    'id': manga_id,
                    'title': data['title'],
                    'slug': html_file.stem,
                    'image': data['image'] or f'/img/{html_file.stem}.jpg',
                    'description': data['description'],
                    'genres': [],
                    'type': 'Manhwa',
                    'status': 'En Emision',
                    'chapters': data['chapters']
                })

    print(f'\nMangas encontrados: {len(mangas_data)}')

    # Extraer datos de capítulos
    print('\n--- Procesando capítulos ---')
    chapters_data = []

    if CAPITULOS_DIR.exists():
        for html_file in sorted(CAPITULOS_DIR.glob('*.html')):
            print(f'Procesando: {html_file.name}')
            data = extract_chapter_data(html_file)
            if data and data['pages']:
                # Encontrar el manga correspondiente
                manga_id = slugify(data['manga_name'])
                chapters_data.append({
                    'mangaId': manga_id,
                    'chapter': data['chapter'],
                    'baseUrl': data['baseUrl'],
                    'pages': data['pages']
                })

    print(f'\nCapítulos encontrados: {len(chapters_data)}')

    # Guardar JSON de mangas
    mangas_json_path = DATA_DIR / 'mangas.json'
    with open(mangas_json_path, 'w', encoding='utf-8') as f:
        json.dump({'mangas': mangas_data}, f, ensure_ascii=False, indent=2)
    print(f'\nGuardado: {mangas_json_path}')

    # Guardar JSON de capítulos
    chapters_json_path = DATA_DIR / 'chapters.json'
    with open(chapters_json_path, 'w', encoding='utf-8') as f:
        json.dump({'chapters': chapters_data}, f, ensure_ascii=False, indent=2)
    print(f'Guardado: {chapters_json_path}')

    print('\n' + '=' * 60)
    print('Extracción completada!')
    print('=' * 60)

    # Mostrar estadísticas
    print(f'\nResumen:')
    print(f'  - Mangas: {len(mangas_data)}')
    print(f'  - Capítulos: {len(chapters_data)}')
    print(f'\nArchivos generados:')
    print(f'  - {mangas_json_path}')
    print(f'  - {chapters_json_path}')
    print(f'\nPuedes usar las nuevas URLs:')
    print(f'  - /manga.html?id=MANGA_ID')
    print(f'  - /chapter.html?manga=MANGA_ID&cap=NUMERO')


if __name__ == '__main__':
    main()
