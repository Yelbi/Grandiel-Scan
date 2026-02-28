@echo off
chcp 65001 >nul

:MENU
cls
echo.
echo  ============================================================
echo     Grandiel Scan  ^|  Servidor de Desarrollo (Next.js)
echo  ============================================================
echo.
echo   [1]  Inicio normal          (puerto 3000, abre navegador)
echo   [2]  Puerto personalizado   (elige el puerto manualmente)
echo   [3]  Sin abrir navegador    (solo inicia el servidor)
echo   [4]  Reiniciar servidor     (cierra el existente y reinicia)
echo   [5]  Abrir navegador        (si el servidor ya esta corriendo)
echo   [6]  Salir
echo.
echo  ============================================================
echo.

choice /c 123456 /n /m "  Selecciona una opcion [1-6]: "

if errorlevel 6 goto :SALIR
if errorlevel 5 goto :ABRIR_BROWSER
if errorlevel 4 goto :REINICIAR
if errorlevel 3 goto :SIN_BROWSER
if errorlevel 2 goto :PUERTO_CUSTOM
if errorlevel 1 goto :NORMAL

:: -------------------------------------------------------
:NORMAL
cls
echo.
echo  [OK] Iniciando servidor en http://localhost:3000
echo  [*]  Presiona Ctrl+C para detener
echo.
start "" "http://localhost:3000"
npm run dev
goto :FIN

:: -------------------------------------------------------
:PUERTO_CUSTOM
cls
echo.
set /p PUERTO="  Ingresa el puerto (ej: 3001): "
if "%PUERTO%"=="" set PUERTO=3001
echo.
echo  [OK] Iniciando servidor en http://localhost:%PUERTO%
echo  [*]  Presiona Ctrl+C para detener
echo.
npm run dev -- --port %PUERTO%
goto :FIN

:: -------------------------------------------------------
:SIN_BROWSER
cls
echo.
echo  [OK] Iniciando servidor en http://localhost:3000 (sin navegador)
echo  [*]  Presiona Ctrl+C para detener
echo.
npm run dev
goto :FIN

:: -------------------------------------------------------
:REINICIAR
cls
echo.
echo  [*] Buscando procesos existentes en puerto 3000...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000 "') do (
    echo  [*] Cerrando proceso PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)
echo  [OK] Listo. Iniciando servidor nuevo...
echo  [*]  Presiona Ctrl+C para detener
echo.
timeout /t 1 /nobreak >nul
npm run dev
goto :FIN

:: -------------------------------------------------------
:ABRIR_BROWSER
cls
echo.
echo  [*] Abriendo http://localhost:3000 en el navegador...
start "" "http://localhost:3000"
echo  [OK] Hecho.
echo.
pause
goto :MENU

:: -------------------------------------------------------
:SALIR
cls
echo.
echo  Hasta luego!
echo.
timeout /t 1 /nobreak >nul
exit /b

:: -------------------------------------------------------
:FIN
echo.
pause
goto :MENU
