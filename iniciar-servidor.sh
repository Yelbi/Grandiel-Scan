#!/usr/bin/env bash
# Lanzador para Linux/macOS, equivalente a iniciar-servidor.bat.
#
# El .bat es un script de Windows (@echo off, setlocal, %~dp0): en Linux no se
# ejecuta de ninguna forma, ni con doble clic ni desde la terminal.
#
# Uso:  ./iniciar-servidor.sh [dev|build|start|seed|studio|test]
#       ./iniciar-servidor.sh          → menú interactivo

set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

rojo()  { printf '\033[1;31m%s\033[0m\n' "$*"; }
verde() { printf '\033[1;32m%s\033[0m\n' "$*"; }
gris()  { printf '\033[0;90m%s\033[0m\n' "$*"; }

# ── Comprobaciones previas ───────────────────────────────────────────────────
if ! command -v npm >/dev/null 2>&1; then
  rojo "Node.js no está instalado."
  echo
  echo "En CachyOS / Arch:"
  echo "    sudo pacman -S nodejs npm"
  echo
  echo "Comprueba después con:  node --version"
  exit 1
fi

if [ ! -d node_modules ] || [ ! -d node_modules/next ]; then
  gris "Faltan las dependencias. Instalando (puede tardar un par de minutos)…"
  npm install
fi

if [ ! -f .env.local ]; then
  rojo "No existe .env.local — la base de datos y el login no funcionarán."
  gris "Copia .env.example a .env.local y rellena los valores reales."
  echo
fi

# ── Acciones ─────────────────────────────────────────────────────────────────
accion="${1:-}"

if [ -z "$accion" ]; then
  echo
  verde "  Grandiel Scan"
  echo
  echo "  1) dev     — servidor de desarrollo en http://localhost:3000"
  echo "  2) build   — compilar para producción"
  echo "  3) start   — servir lo compilado"
  echo "  4) seed    — cargar los datos de data/*.json en la base"
  echo "  5) studio  — abrir Drizzle Studio (explorador de la base)"
  echo "  6) test    — probar el parser de capítulos"
  echo
  read -rp "  Elige [1-6]: " opcion
  case "$opcion" in
    1) accion=dev    ;; 2) accion=build  ;; 3) accion=start ;;
    4) accion=seed   ;; 5) accion=studio ;; 6) accion=test  ;;
    *) rojo "Opción no válida."; exit 1 ;;
  esac
fi

case "$accion" in
  dev)
    verde "Arrancando en http://localhost:3000  (Ctrl+C para parar)"
    exec npm run dev
    ;;
  build)  exec npm run build ;;
  start)  exec npm run start ;;
  seed)   exec npm run db:seed ;;
  studio) exec npm run db:studio ;;
  test)   exec npm run test:discover ;;
  *)
    rojo "Acción desconocida: $accion"
    echo "Válidas: dev, build, start, seed, studio, test"
    exit 1
    ;;
esac
