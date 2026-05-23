@echo off
setlocal EnableExtensions
cd /d %~dp0

set "ACTION="
set "PAUSE_AT_END=1"
set "OPEN_BROWSER=1"
set "RUN_SEED=0"

if "%~1"=="" goto menu

:parse
if "%~1"=="" goto validate
if /I "%~1"=="start"        set "ACTION=start"
if /I "%~1"=="stop"         set "ACTION=stop"
if /I "%~1"=="restart"      set "ACTION=restart"
if /I "%~1"=="build"        set "ACTION=build"
if /I "%~1"=="seed"         set "ACTION=seed"
if /I "%~1"=="--no-pause"   set "PAUSE_AT_END=0"
if /I "%~1"=="--no-browser" set "OPEN_BROWSER=0"
if /I "%~1"=="--seed"       set "RUN_SEED=1"
shift
goto parse

:menu
echo ========================================
echo  Grandiel Scan - Servidor de Desarrollo
echo ========================================
echo.

netstat -ano 2>nul | findstr /r "TCP.*:3000 .*LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo  Estado: [ACTIVO]   http://localhost:3000
) else (
    echo  Estado: [INACTIVO] Servidor detenido
)
echo.
echo Accion:
echo  1) start
echo  2) stop
echo  3) restart
echo  4) restart + seed (actualizar base de datos)
echo  5) solo seed (db:seed)
echo  6) build (compilar para produccion)
echo  7) salir
set /p ACTION_CHOICE=Selecciona una opcion [1-7]:
if "%ACTION_CHOICE%"=="7" exit /b 0
if "%ACTION_CHOICE%"=="1" set "ACTION=start"
if "%ACTION_CHOICE%"=="2" set "ACTION=stop"
if "%ACTION_CHOICE%"=="3" set "ACTION=restart"
if "%ACTION_CHOICE%"=="4" (
  set "ACTION=restart"
  set "RUN_SEED=1"
)
if "%ACTION_CHOICE%"=="5" set "ACTION=seed"
if "%ACTION_CHOICE%"=="6" set "ACTION=build"
if not defined ACTION goto menu

if "%ACTION%"=="seed"  goto run_seed_only
if "%ACTION%"=="build" goto build

echo.
set /p BROWSER_CHOICE=Abrir navegador al final? [S/n]:
if /I "%BROWSER_CHOICE%"=="n" set "OPEN_BROWSER=0"
goto validate

:validate
if not defined ACTION goto usage
if /I "%ACTION%"=="start"   goto start
if /I "%ACTION%"=="stop"    goto stop
if /I "%ACTION%"=="restart" goto restart
if /I "%ACTION%"=="build"   goto build
if /I "%ACTION%"=="seed"    goto run_seed_only

:usage
echo Uso:
echo   iniciar-servidor.bat start   [--no-pause] [--no-browser] [--seed]
echo   iniciar-servidor.bat stop    [--no-pause]
echo   iniciar-servidor.bat restart [--no-pause] [--no-browser] [--seed]
echo   iniciar-servidor.bat build   [--no-pause]
echo   iniciar-servidor.bat seed
echo.
echo Opciones:
echo   --seed       Ejecutar db:seed despues de iniciar
exit /b 1

:wait_for_nextjs
echo [INFO] Esperando a que el servidor este listo...
set /a attempts=0
:wait_loop
set /a attempts+=1
if %attempts% gtr 30 (
  echo [WARNING] Timeout esperando el servidor. Continuando de todos modos...
  exit /b 0
)
netstat -ano 2>nul | findstr /r "TCP.*:3000 .*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
  echo [OK] Servidor listo!
  exit /b 0
)
timeout /t 2 /nobreak >nul
goto wait_loop

:run_seed
echo.
echo ========================================
echo  Ejecutando Seed (Actualizando BD)
echo ========================================
echo.
call :wait_for_nextjs
echo [INFO] Ejecutando db:seed...
call npm run db:seed
if %errorlevel% equ 0 (
  echo [OK] Seed ejecutado correctamente
) else (
  echo [ERROR] Error al ejecutar seed
)
exit /b 0

:run_seed_only
echo.
echo ========================================
echo  Ejecutando Solo Seed
echo ========================================
echo.
echo [INFO] Verificando que el servidor este corriendo...
netstat -ano 2>nul | findstr /r "TCP.*:3000 .*LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] El servidor no esta corriendo. Inicia el sistema primero.
  if "%PAUSE_AT_END%"=="1" pause
  exit /b 1
)
echo [INFO] Ejecutando db:seed...
call npm run db:seed
if %errorlevel% equ 0 (
  echo.
  echo ========================================
  echo [OK] Seed ejecutado correctamente
  echo ========================================
) else (
  echo [ERROR] Error al ejecutar seed
)
echo.
if "%PAUSE_AT_END%"=="1" pause
exit /b 0

:: ============================================================
:start
echo.
echo ========================================
echo  Iniciando Grandiel Scan
echo ========================================
echo.
call :start_nextjs
call :start_studio

if "%RUN_SEED%"=="1" (
  call :run_seed
)

echo.
echo ========================================
echo  SERVICIOS CORRIENDO:
echo ========================================
echo  App + API:      http://localhost:3000
echo  Admin Panel:    http://localhost:3000/admin
echo  Drizzle Studio: http://localhost:4983
echo ========================================
echo.

if "%OPEN_BROWSER%"=="1" (
  echo Esperando 6 segundos para que el servidor arranque...
  timeout /t 6 /nobreak >nul
  start "" http://localhost:3000
  timeout /t 1 /nobreak >nul
  start "" http://localhost:3000/admin
)

echo Para detener: iniciar-servidor.bat stop
echo Para actualizar BD: iniciar-servidor.bat seed
echo.
if "%PAUSE_AT_END%"=="1" pause
exit /b 0

:start_nextjs
echo [1/2] Iniciando Next.js Dev Server (Puerto 3000)...
start "Grandiel Scan - App/API (Puerto 3000)" cmd /k "cd /d %~dp0 && npm run dev"
timeout /t 2 /nobreak >nul
exit /b 0

:start_studio
echo [2/2] Iniciando Drizzle Studio (Puerto 4983)...
start "Grandiel Scan - Drizzle Studio (Puerto 4983)" cmd /k "cd /d %~dp0 && npm run db:studio"
exit /b 0

:: ============================================================
:stop
echo.
echo ========================================
echo  Deteniendo Grandiel Scan
echo ========================================
echo.
call :kill_node_ports

echo.
echo [2/2] Cerrando ventanas de consola...
taskkill /FI "WindowTitle eq Grandiel Scan - App/API (Puerto 3000)*" /F >nul 2>&1
taskkill /FI "WindowTitle eq Grandiel Scan - Drizzle Studio (Puerto 4983)*" /F >nul 2>&1

echo.
echo ========================================
echo  Todos los servicios detenidos
echo ========================================
echo.
if "%PAUSE_AT_END%"=="1" pause
exit /b 0

:kill_node_ports
echo [1/2] Deteniendo procesos en puertos 3000 y 4983...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :3000') do (
  taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :4983') do (
  taskkill /F /PID %%a >nul 2>&1
)
echo [OK] Procesos detenidos
exit /b 0

:: ============================================================
:restart
echo.
echo ========================================
echo  Reiniciando Grandiel Scan
echo ========================================
echo.
set "BROWSER_FLAG="
if "%OPEN_BROWSER%"=="0" set "BROWSER_FLAG=--no-browser"

set "SEED_FLAG="
if "%RUN_SEED%"=="1" set "SEED_FLAG=--seed"

call "%~f0" stop --no-pause
echo.
echo Esperando 3 segundos antes de reiniciar...
timeout /t 3 /nobreak >nul
call "%~f0" start %BROWSER_FLAG% %SEED_FLAG%
exit /b 0

:: ============================================================
:build
echo.
echo ========================================
echo  Build de Produccion
echo ========================================
echo.
echo [INFO] Ejecutando npm run build...
echo [INFO] Esto puede tardar varios minutos.
echo.
npm run build
if %errorlevel% equ 0 (
  echo.
  echo ========================================
  echo [OK] Build completado exitosamente
  echo ========================================
) else (
  echo.
  echo [ERROR] El build fallo. Revisa los errores arriba.
)
echo.
if "%PAUSE_AT_END%"=="1" pause
exit /b 0
