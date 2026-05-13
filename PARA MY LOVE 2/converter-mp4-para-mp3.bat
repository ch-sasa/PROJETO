@echo off
setlocal

cd /d "%~dp0"

set "PASTA_VIDEOS=videos-para-converter"
set "PASTA_MUSICAS=musicas"
set "PASTA_LETRAS=letras"

if exist ".venv\Scripts\python.exe" (
    set "PYTHON=.venv\Scripts\python.exe"
    set "PATH=%CD%\.venv\Scripts;%PATH%"
) else (
    set "PYTHON=python"
)

if not exist "ferramentas\converter_mp4_para_mp3.py" (
    echo [ERRO] Nao encontrei ferramentas\converter_mp4_para_mp3.py
    pause
    exit /b 1
)

if not exist "%PASTA_VIDEOS%\" (
    mkdir "%PASTA_VIDEOS%"
)

echo Pasta dos videos MP4: %PASTA_VIDEOS%
echo Pasta de saida MP3: %PASTA_MUSICAS%
echo Pasta das letras: %PASTA_LETRAS%
echo.

"%PYTHON%" "ferramentas\converter_mp4_para_mp3.py" --entrada "%PASTA_VIDEOS%" --saida "%PASTA_MUSICAS%" --letras "%PASTA_LETRAS%"

echo.
pause
