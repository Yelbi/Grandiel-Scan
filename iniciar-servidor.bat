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
echo   [5]  Build de produccion    (npm run build)
echo   [6]  Abrir navegador        (si el servidor ya esta corriendo)
echo   [7]  Salir
echo.
echo  ============================================================
echo.

choice /c 1234567 /n /m "  Selecciona una opcion [1-7]: "

if errorlevel 7 goto :SALIR
if errorlevel 6 goto :ABRIR_BROWSER
if errorlevel 5 goto :BUILD
if errorlevel 4 goto :REINICIAR
if errorlevel 3 goto :SIN_BROWSER
if errorlevel 2 goto :PUERTO_CUSTOM
if errorlevel 1 goto :NORMAL

:: -------------------------------------------------------
:NORMAL
cls
echo.
echo  [OK] Iniciando servidor en http://localhost:3000
echo  [*]  Abriendo navegador en 3 segundos...
echo  [*]  Presiona Ctrl+C para detener
echo.
:: Abrir el navegador en segundo plano despues de un breve delay
:: para que el servidor tenga tiempo de iniciar.
start /b cmd /c "timeout /t 3 /nobreak >nul && start "" http://localhost:3000"
npm run dev
goto :FIN

:: -------------------------------------------------------
:PUERTO_CUSTOM
cls
echo.
set /p PUERTO="  Ingresa el puerto (ej: 3001): "
if "%PUERTO%"=="" set PUERTO=3001

:: Validar que sea numerico y este en rango
set /a PUERTO_NUM=%PUERTO% 2>nul
if %PUERTO_NUM% LSS 1024 (
    echo  [!] Puerto invalido. Usando 3001.
    set PUERTO=3001
    set PUERTO_NUM=3001
)
if %PUERTO_NUM% GTR 65535 (
    echo  [!] Puerto invalido. Usando 3001.
    set PUERTO=3001
    set PUERTO_NUM=3001
)

echo.
echo  [OK] Iniciando servidor en http://localhost:%PUERTO%
echo  [*]  Abriendo navegador en 3 segundos...
echo  [*]  Presiona Ctrl+C para detener
echo.
start /b cmd /c "timeout /t 3 /nobreak >nul && start "" http://localhost:%PUERTO%"
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
set ENCONTRADO=0
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr /r "TCP.*:3000 .*LISTENING"') do (
    echo  [*] Cerrando proceso PID %%a...
    taskkill /F /PID %%a >nul 2>&1
    set ENCONTRADO=1
)
if %ENCONTRADO%==0 echo  [*] No se encontro ningun proceso activo en el puerto 3000.
echo  [OK] Iniciando servidor nuevo...
echo  [*]  Presiona Ctrl+C para detener
echo.
timeout /t 1 /nobreak >nul
npm run dev
goto :FIN

:: -------------------------------------------------------
:BUILD
cls
echo.
echo  [*] Ejecutando npm run build...
echo  [*]  Esto puede tardar varios minutos.
echo.
npm run build
if errorlevel 1 (
    echo.
    echo  [!] El build fallo. Revisa los errores arriba.
) else (
    echo.
    echo  [OK] Build completado exitosamente.
)
echo.
pause
goto :MENU

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
