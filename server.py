#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Servidor de desarrollo local para Grandiel Scan
Usa el servidor HTTP integrado de Python
"""

import http.server
import socketserver
import webbrowser
import os
import sys
from pathlib import Path

# Puerto del servidor
PORT = 8000

# Configurar encoding para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Handler personalizado para manejar correctamente las rutas"""

    def end_headers(self):
        """Agregar headers para mejor desarrollo"""
        # No cachear durante desarrollo
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        """Manejar peticiones GET"""
        # Redirigir / a /index.html
        if self.path == '/':
            self.path = '/index.html'

        # Manejar /Inicio.html -> /index.html
        if self.path == '/Inicio.html':
            self.path = '/index.html'

        return super().do_GET()

def main():
    """Función principal"""
    # Cambiar al directorio del script
    os.chdir(Path(__file__).parent)

    print("=" * 60)
    print("   Servidor de Desarrollo - Grandiel Scan")
    print("=" * 60)
    print()
    print(f"Iniciando servidor en http://localhost:{PORT}")
    print()
    print("Presiona Ctrl+C para detener el servidor")
    print("=" * 60)
    print()

    # Configurar el servidor
    handler = MyHTTPRequestHandler

    try:
        with socketserver.TCPServer(("", PORT), handler) as httpd:
            print(f"[OK] Servidor corriendo en: http://localhost:{PORT}")
            print(f"[OK] Archivos servidos desde: {os.getcwd()}")
            print()

            # Abrir navegador automáticamente
            try:
                webbrowser.open(f'http://localhost:{PORT}')
                print("[*] Abriendo navegador...")
            except:
                print("[!] No se pudo abrir el navegador automáticamente")
                print(f"[*] Abre manualmente: http://localhost:{PORT}")

            print()
            print("Logs de peticiones:")
            print("-" * 60)

            # Servir indefinidamente
            httpd.serve_forever()

    except KeyboardInterrupt:
        print("\n")
        print("=" * 60)
        print("[*] Servidor detenido por el usuario")
        print("=" * 60)
        sys.exit(0)
    except OSError as e:
        if e.errno == 10048:  # Puerto en uso en Windows
            print(f"\n[ERROR] El puerto {PORT} ya está en uso")
            print("[*] Cierra cualquier otro servidor o cambia el puerto")
        else:
            print(f"\n[ERROR] {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
