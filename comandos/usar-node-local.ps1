$nodePath = Join-Path $PSScriptRoot "..\.tools\node"

if (-not (Test-Path -LiteralPath (Join-Path $nodePath "node.exe"))) {
    Write-Error "Node local nao encontrado em: $nodePath"
    exit 1
}

$env:Path = "$nodePath;$env:Path"

node --version
npm --version
