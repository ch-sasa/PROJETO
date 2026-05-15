@echo off
set "NODE_LOCAL=%~dp0..\.tools\node"

if not exist "%NODE_LOCAL%\node.exe" (
    echo [ERRO] Node local nao encontrado em: %NODE_LOCAL%
    exit /b 1
)

set "PATH=%NODE_LOCAL%;%PATH%"

node --version
npm --version
