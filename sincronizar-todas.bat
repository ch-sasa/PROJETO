@echo off
setlocal EnableDelayedExpansion

if exist ".venv\Scripts\python.exe" (
    set "PYTHON=.venv\Scripts\python.exe"
    set "PATH=%CD%\.venv\Scripts;%PATH%"
) else (
    set "PYTHON=python"
)

set "MODELO=small"

set /a encontradas=0
set /a processadas=0
set /a puladas=0
set /a semLetra=0
set /a erros=0

echo ==========================================
echo Sincronizando musicas da pasta musicas
echo ==========================================
echo.

if not exist "musicas\" (
    echo [ERRO] A pasta musicas nao existe.
    pause
    exit /b
)

if not exist "letras\" (
    echo [ERRO] A pasta letras nao existe.
    pause
    exit /b
)

if not exist "ferramentas\sincronizar_letra.py" (
    echo [ERRO] O arquivo ferramentas\sincronizar_letra.py nao foi encontrado.
    pause
    exit /b
)

if not exist "letras-sincronizadas\" (
    mkdir "letras-sincronizadas"
)

for %%F in ("musicas\*.mp3") do (
    if exist "%%F" (
        set /a encontradas+=1

        set "NOME=%%~nF"
        set "AUDIO=%%F"
        set "LETRA=letras\%%~nF.txt"
        set "SAIDA=letras-sincronizadas\%%~nF.txt"

        if not exist "!LETRA!" (
            echo [SEM LETRA] !NOME!
            echo Nao encontrei: !LETRA!
            echo.
            set /a semLetra+=1
        ) else (
            set "PROCESSAR=1"

            if exist "!SAIDA!" (
                powershell -NoProfile -ExecutionPolicy Bypass -Command "$audio=Get-Item -LiteralPath $env:AUDIO; $letra=Get-Item -LiteralPath $env:LETRA; $saida=Get-Item -LiteralPath $env:SAIDA; if (($audio.LastWriteTime -le $saida.LastWriteTime) -and ($letra.LastWriteTime -le $saida.LastWriteTime)) { exit 0 } exit 1"

                if !ERRORLEVEL! EQU 0 (
                    set "PROCESSAR=0"
                )
            )

            if "!PROCESSAR!"=="0" (
                echo [PULANDO] !NOME!
                echo.
                set /a puladas+=1
            ) else (
                echo [PROCESSANDO] !NOME!
                echo Audio: !AUDIO!
                echo Letra: !LETRA!
                echo Saida: !SAIDA!
                echo.

                %PYTHON% "ferramentas\sincronizar_letra.py" --audio "!AUDIO!" --letra "!LETRA!" --saida "!SAIDA!" --modelo %MODELO%

                if errorlevel 1 (
                    echo.
                    echo [ERRO] Falha ao processar !NOME!
                    echo.
                    set /a erros+=1
                ) else (
                    echo.
                    echo [OK] !NOME! sincronizada.
                    echo.
                    set /a processadas+=1
                )
            )
        )
    )
)

if !encontradas! EQU 0 (
    echo [AVISO] Nenhum arquivo .mp3 encontrado em musicas.
    echo.
)

echo ==========================================
echo RESUMO
echo ==========================================
echo MP3 encontradas: !encontradas!
echo Processadas: !processadas!
echo Puladas: !puladas!
echo Sem letra: !semLetra!
echo Erros: !erros!
echo ==========================================
echo.

pause
