@echo off
chcp 65001 >nul
cls

echo ============================================================
echo    Servidor de Desarrollo - Grandiel Scan
echo ============================================================
echo.
echo Iniciando servidor local en el puerto 8000...
echo.
echo Presiona Ctrl+C para detener el servidor
echo ============================================================
echo.

python server.py

pause
