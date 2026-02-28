#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Servidor de desarrollo local para Grandiel Scan
- Sirve archivos estáticos con headers no-cache
- Vigila cambios en JS/CSS/HTML y actualiza CACHE_VERSION automáticamente
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import re
import time
import threading
import argparse
from pathlib import Path
from datetime import datetime

# Configurar encoding para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# ──────────────────────────────────────────────
# Watcher de archivos
# ──────────────────────────────────────────────

WATCH_EXTENSIONS = {'.js', '.css', '.html'}
WATCH_IGNORE_DIRS = {'node_modules', '.git', '__pycache__', '.claude'}
SW_FILE = 'sw.js'

# Tiempo mínimo entre dos bumps consecutivos (segundos)
DEBOUNCE_SECONDS = 1.5

_last_bump_time = 0
_sw_mtime_after_bump = None


def _log(msg: str):
    ts = datetime.now().strftime('%H:%M:%S')
    print(f'[{ts}] {msg}', flush=True)


def bump_cache_version(base_path: str):
    """Incrementa el número de patch en CACHE_VERSION de sw.js."""
    global _sw_mtime_after_bump

    sw_path = os.path.join(base_path, SW_FILE)
    if not os.path.exists(sw_path):
        return None

    try:
        with open(sw_path, 'r', encoding='utf-8') as f:
            content = f.read()

        match = re.search(r"const CACHE_VERSION = 'v(\d+)\.(\d+)\.(\d+)';", content)
        if not match:
            return None

        major, minor, patch = int(match.group(1)), int(match.group(2)), int(match.group(3))
        new_version = f'v{major}.{minor}.{patch + 1}'

        new_content = content.replace(
            f"const CACHE_VERSION = 'v{major}.{minor}.{patch}';",
            f"const CACHE_VERSION = '{new_version}';"
        )

        with open(sw_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        # Guardar mtime resultante para no disparar el watcher sobre sw.js
        _sw_mtime_after_bump = os.path.getmtime(sw_path)
        return new_version

    except Exception as e:
        _log(f'[!] Error al actualizar CACHE_VERSION: {e}')
        return None


def _on_file_changed(filepath: str, base_path: str):
    """Callback cuando se detecta un cambio. Aplica debounce y bumpa la versión."""
    global _last_bump_time

    now = time.time()
    if now - _last_bump_time < DEBOUNCE_SECONDS:
        return

    _last_bump_time = now
    rel = os.path.relpath(filepath, base_path)
    new_ver = bump_cache_version(base_path)

    if new_ver:
        _log(f'Cambio: {rel}  →  CACHE_VERSION={new_ver}')
    else:
        _log(f'Cambio: {rel}')


class FileWatcher:
    """Vigila archivos JS/CSS/HTML y llama al callback cuando cambian."""

    def __init__(self, base_path: str, callback):
        self.base_path = base_path
        self.callback = callback
        self._mtimes = {}
        self._running = False

    def _scan(self):
        for root, dirs, files in os.walk(self.base_path):
            dirs[:] = [d for d in dirs if d not in WATCH_IGNORE_DIRS]

            for name in files:
                if Path(name).suffix not in WATCH_EXTENSIONS:
                    continue

                fpath = os.path.join(root, name)

                # No disparar watcher sobre el sw.js que acabamos de escribir nosotros
                if name == SW_FILE and fpath == os.path.join(self.base_path, SW_FILE):
                    try:
                        current_mtime = os.path.getmtime(fpath)
                        if _sw_mtime_after_bump and abs(current_mtime - _sw_mtime_after_bump) < 0.1:
                            self._mtimes[fpath] = current_mtime
                            continue
                    except OSError:
                        pass

                try:
                    mtime = os.path.getmtime(fpath)
                except OSError:
                    continue

                if fpath in self._mtimes:
                    if mtime != self._mtimes[fpath]:
                        self._mtimes[fpath] = mtime
                        self.callback(fpath, self.base_path)
                else:
                    self._mtimes[fpath] = mtime

    def start(self):
        self._running = True
        self._scan()  # Escaneo inicial para poblar timestamps

        def _loop():
            while self._running:
                time.sleep(0.8)
                self._scan()

        t = threading.Thread(target=_loop, daemon=True)
        t.start()

    def stop(self):
        self._running = False


# ──────────────────────────────────────────────
# Handler HTTP
# ──────────────────────────────────────────────

# Errores de conexión esperados: el browser canceló la petición antes de que
# el servidor terminara de enviar (navegar, recargar, prefetch cancelado, etc.)
_CONNECTION_ERRORS = (ConnectionAbortedError, ConnectionResetError, BrokenPipeError)


class GrandielHTTPHandler(http.server.SimpleHTTPRequestHandler):
    """Handler con headers no-cache y redirecciones básicas."""

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Expires', '0')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        self.send_header('Referrer-Policy', 'same-origin')
        super().end_headers()

    def do_GET(self):
        if self.path in ('/', '/Inicio.html'):
            self.path = '/index.html'
        return super().do_GET()

    def copyfile(self, source, outputfile):
        """Sobrescribe copyfile para silenciar errores cuando el browser cierra la conexión."""
        try:
            super().copyfile(source, outputfile)
        except _CONNECTION_ERRORS:
            pass

    def log_message(self, format, *args):
        # Mostrar solo errores 4xx/5xx y navegación a páginas HTML
        msg = format % args
        code = str(args[1]) if len(args) > 1 else ''
        if code.startswith(('4', '5')) or self.path.endswith('.html'):
            ts = datetime.now().strftime('%H:%M:%S')
            print(f'[{ts}] {self.address_string()} {msg}', flush=True)


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Servidor de desarrollo Grandiel Scan')
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--no-watch', action='store_true', help='Desactivar watcher de archivos')
    args = parser.parse_args()

    PORT = args.port
    base_path = str(Path(__file__).parent)
    os.chdir(base_path)

    print('=' * 60)
    print('   Servidor de Desarrollo — Grandiel Scan')
    print('=' * 60)
    print(f'  URL:     http://localhost:{PORT}')
    print(f'  Carpeta: {base_path}')

    watcher = None
    if not args.no_watch:
        watcher = FileWatcher(base_path, _on_file_changed)
        watcher.start()
        print('  Watcher: ACTIVO — JS/CSS/HTML → bumps CACHE_VERSION')
    else:
        print('  Watcher: desactivado (--no-watch)')

    print()
    print('  Ctrl+C para detener')
    print('=' * 60)
    print()

    socketserver.TCPServer.allow_reuse_address = True

    try:
        with socketserver.TCPServer(('', PORT), GrandielHTTPHandler) as httpd:
            _log(f'Servidor listo en http://localhost:{PORT}')

            if not args.no_browser:
                try:
                    webbrowser.open(f'http://localhost:{PORT}')
                    _log('Navegador abierto.')
                except Exception:
                    _log(f'Abre manualmente: http://localhost:{PORT}')
            else:
                _log(f'Accede en: http://localhost:{PORT}')

            print()
            httpd.serve_forever()

    except KeyboardInterrupt:
        print()
        _log('Servidor detenido.')
        if watcher:
            watcher.stop()
        sys.exit(0)

    except OSError as e:
        if e.errno == 10048:
            print(f'\n[ERROR] El puerto {PORT} ya esta en uso.')
            print(f'        Usa --port para elegir otro, o cierra el proceso existente.')
        else:
            print(f'\n[ERROR] {e}')
        sys.exit(1)


if __name__ == '__main__':
    main()
