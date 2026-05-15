@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0.."

if exist ".venv\Scripts\python.exe" (
    set "PYTHON=.venv\Scripts\python.exe"
    set "PATH=%CD%\.venv\Scripts;%PATH%"
) else (
    set "PYTHON=python"
)

set "MODELO=small"
set "IDIOMA=auto"
set "PASTA_VIDEOS=midia\videos-para-converter"
set "PASTA_MUSICAS=midia\musicas"
set "PASTA_LETRAS=midia\letras"
set "PASTA_LETRAS_SINCRONIZADAS=midia\letras-sincronizadas"
set "CONVERSOR=ferramentas\converter_mp4_para_mp3.py"
set "SINCRONIZADOR=ferramentas\sincronizar_letra.py"
set "ATUALIZADOR=ferramentas\atualizar_musicas_script.py"

call :prepararPastas

:menu
cls
echo ==========================================
echo O que voce quer fazer?
echo ==========================================
echo.
echo [1] Converter videos para MP3
echo [2] Sincronizar letras e atualizar musicas
echo [3] Fazer tudo
echo [4] Atualizar apenas a lista de musicas
echo [0] Sair
echo.
set "OPCAO="
set /p "OPCAO=Digite a opcao: "

if "%OPCAO%"=="1" (
    call :resetarContadores
    call :converterVideos
    call :mostrarResumo
    goto fim
)

if "%OPCAO%"=="2" (
    call :resetarContadores
    call :sincronizarLetras
    call :atualizarListaMusicas
    call :mostrarResumo
    goto fim
)

if "%OPCAO%"=="3" (
    call :resetarContadores
    call :converterVideos
    call :sincronizarLetras
    call :atualizarListaMusicas
    call :mostrarResumo
    goto fim
)

if "%OPCAO%"=="4" (
    call :resetarContadores
    call :atualizarListaMusicas
    call :mostrarResumo
    goto fim
)

if "%OPCAO%"=="0" (
    exit /b 0
)

echo.
echo [AVISO] Opcao invalida.
pause
goto menu

:prepararPastas
if not exist "%PASTA_VIDEOS%\" (
    mkdir "%PASTA_VIDEOS%"
)

if not exist "%PASTA_MUSICAS%\" (
    mkdir "%PASTA_MUSICAS%"
)

if not exist "%PASTA_LETRAS%\" (
    mkdir "%PASTA_LETRAS%"
)

if not exist "%PASTA_LETRAS_SINCRONIZADAS%\" (
    mkdir "%PASTA_LETRAS_SINCRONIZADAS%"
)

exit /b 0

:resetarContadores
set /a videosEncontrados=0
set /a mp3Encontradas=0
set /a letrasProcessadas=0
set /a letrasPuladas=0
set /a letrasSemArquivo=0
set /a erros=0
exit /b 0

:contarVideos
set /a videosEncontrados=0

for %%V in ("%PASTA_VIDEOS%\*.mp4" "%PASTA_VIDEOS%\*.mkv" "%PASTA_VIDEOS%\*.mov" "%PASTA_VIDEOS%\*.avi" "%PASTA_VIDEOS%\*.webm" "%PASTA_VIDEOS%\*.flv" "%PASTA_VIDEOS%\*.wmv" "%PASTA_VIDEOS%\*.m4v" "%PASTA_VIDEOS%\*.mpg" "%PASTA_VIDEOS%\*.mpeg" "%PASTA_VIDEOS%\*.3gp" "%PASTA_VIDEOS%\*.3g2" "%PASTA_VIDEOS%\*.ts" "%PASTA_VIDEOS%\*.mts" "%PASTA_VIDEOS%\*.m2ts" "%PASTA_VIDEOS%\*.ogv") do (
    if exist "%%~fV" (
        set /a videosEncontrados+=1
    )
)

exit /b 0

:converterVideos
echo.
echo ==========================================
echo Converter videos para MP3
echo ==========================================
echo Pasta dos videos: %PASTA_VIDEOS%
echo Pasta de saida MP3: %PASTA_MUSICAS%
echo Pasta das letras: %PASTA_LETRAS%
echo.

if not exist "%CONVERSOR%" (
    echo [ERRO] O arquivo %CONVERSOR% nao foi encontrado.
    echo.
    set /a erros+=1
    exit /b 1
)

call :contarVideos

if !videosEncontrados! EQU 0 (
    echo [AVISO] Nenhum video encontrado para converter.
    echo.
    exit /b 0
)

"%PYTHON%" "%CONVERSOR%" --entrada "%PASTA_VIDEOS%" --saida "%PASTA_MUSICAS%" --letras "%PASTA_LETRAS%"

if errorlevel 1 (
    echo.
    echo [ERRO] Falha na etapa de conversao.
    echo.
    set /a erros+=1
    exit /b 1
)

echo.
echo [OK] Conversao finalizada.
echo.
exit /b 0

:sincronizarLetras
echo.
echo ==========================================
echo Sincronizar letras
echo ==========================================
echo.

if not exist "%SINCRONIZADOR%" (
    echo [ERRO] O arquivo %SINCRONIZADOR% nao foi encontrado.
    echo.
    set /a erros+=1
    exit /b 1
)

for %%F in ("%PASTA_MUSICAS%\*.mp3") do (
    if exist "%%F" (
        set /a mp3Encontradas+=1

        set "NOME=%%~nF"
        set "AUDIO=%%F"
        set "LETRA=%PASTA_LETRAS%\%%~nF.txt"
        set "SAIDA=%PASTA_LETRAS_SINCRONIZADAS%\%%~nF.txt"

        if not exist "!LETRA!" (
            echo [SEM LETRA] !NOME!
            echo Nao encontrei: !LETRA!
            echo.
            set /a letrasSemArquivo+=1
        ) else (
            set "PROCESSAR=1"

            if exist "!SAIDA!" (
                powershell -NoProfile -ExecutionPolicy Bypass -Command "$audio=Get-Item -LiteralPath $env:AUDIO; $letra=Get-Item -LiteralPath $env:LETRA; $saida=Get-Item -LiteralPath $env:SAIDA; $sincronizador=Get-Item -LiteralPath $env:SINCRONIZADOR; if (($audio.LastWriteTime -le $saida.LastWriteTime) -and ($letra.LastWriteTime -le $saida.LastWriteTime) -and ($sincronizador.LastWriteTime -le $saida.LastWriteTime)) { exit 0 } exit 1"

                if !ERRORLEVEL! EQU 0 (
                    set "PROCESSAR=0"
                )
            )

            if "!PROCESSAR!"=="0" (
                echo [PULANDO] !NOME!
                echo.
                set /a letrasPuladas+=1
            ) else (
                echo [PROCESSANDO] !NOME!
                echo Audio: !AUDIO!
                echo Letra: !LETRA!
                echo Saida: !SAIDA!
                echo.

                "%PYTHON%" "%SINCRONIZADOR%" --audio "!AUDIO!" --letra "!LETRA!" --saida "!SAIDA!" --modelo %MODELO% --idioma %IDIOMA%

                if errorlevel 1 (
                    echo.
                    echo [ERRO] Falha ao processar !NOME!
                    echo.
                    set /a erros+=1
                ) else (
                    echo.
                    echo [OK] !NOME! sincronizada.
                    echo.
                    set /a letrasProcessadas+=1
                )
            )
        )
    )
)

if !mp3Encontradas! EQU 0 (
    echo [AVISO] Nenhum arquivo .mp3 encontrado em %PASTA_MUSICAS%.
    echo.
)

exit /b 0

:atualizarListaMusicas
echo.
echo ==========================================
echo Atualizar lista de musicas
echo ==========================================
echo.

if not exist "%ATUALIZADOR%" (
    echo [ERRO] O arquivo %ATUALIZADOR% nao foi encontrado.
    echo.
    set /a erros+=1
    exit /b 1
)

"%PYTHON%" "%ATUALIZADOR%" --script "assets\js\script.js" --musicas "%PASTA_MUSICAS%" --letras "%PASTA_LETRAS_SINCRONIZADAS%"

if errorlevel 1 (
    echo [ERRO] Falha ao atualizar assets\js\script.js.
    echo.
    set /a erros+=1
    exit /b 1
)

echo.
exit /b 0

:mostrarResumo
echo ==========================================
echo RESUMO
echo ==========================================
echo Videos encontrados: !videosEncontrados!
echo MP3 encontradas: !mp3Encontradas!
echo Letras processadas: !letrasProcessadas!
echo Letras puladas: !letrasPuladas!
echo Sem letra: !letrasSemArquivo!
echo Erros: !erros!
echo ==========================================
echo.
exit /b 0

:fim
pause
exit /b 0
