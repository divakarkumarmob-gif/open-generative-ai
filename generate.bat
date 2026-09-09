@echo off
setlocal enabledelayedexpansion

set "BIN=%APPDATA%\open-generative-ai\local-ai\bin\sd-cli.exe"
set "MODEL=%APPDATA%\open-generative-ai\local-ai\models\DreamShaper_8_pruned.safetensors"
set "OUT_DIR=%~dp0output"

if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

if not exist "%BIN%" (
    echo [ERROR] sd-cli.exe nahi mila.
    exit /b 1
)

if not exist "%MODEL%" (
    echo [ERROR] Model file nahi mili.
    exit /b 1
)

set "PROMPT=%~1"
if "%PROMPT%"=="" (
    echo ========================================================
    echo   ⚡ Open Generative AI - Direct Terminal Generator
    echo ========================================================
    set /p PROMPT="Prompt likhein (e.g. beautiful woman portrait, 8k): "
)

if "%PROMPT%"=="" (
    echo [ERROR] Prompt khali nahi ho sakta.
    exit /b 1
)

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set "dt=%%I"
set "TIMESTAMP=%dt:~0,8%_%dt:~8,6%"
set "OUT_FILE=%OUT_DIR%\img_%TIMESTAMP%.png"

echo.
echo [*] Generating image on local GPU/CPU...
echo [*] Prompt: "%PROMPT%"
echo [*] Output: %OUT_FILE%
echo.

"%BIN%" -m "%MODEL%" -p "%PROMPT%" -n "ugly, blurry, deformed hands, bad anatomy, low quality" --steps 20 --cfg-scale 7.5 -W 512 -H 512 -o "%OUT_FILE%"

if exist "%OUT_FILE%" (
    echo.
    echo [SUCCESS] Image generate ho gayi: %OUT_FILE%
    start "" "%OUT_FILE%"
) else (
    echo.
    echo [FAILED] Generation me koi error aaya.
)
