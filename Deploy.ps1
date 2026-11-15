# Deploy.ps1 - Construye y publica rolapp en GitHub Pages (rama gh-pages)
# Prerrequisitos: Node.js v20+, npm y Git con credenciales para el repositorio.
# Usa el paquete 'gh-pages', que publica SOLO el contenido de ./dist
# (no toca tu rama actual ni sube node_modules).

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$siteUrl = 'https://adminsantrax.github.io/rolapp/'

Write-Host 'Instalando dependencias...'
npm install
if ($LASTEXITCODE -ne 0) { throw 'npm install falló.' }

Write-Host 'Construyendo y publicando en gh-pages...'
npm run deploy
if ($LASTEXITCODE -ne 0) { throw 'El despliegue falló.' }

Write-Host "Despliegue completado. Verifica en $siteUrl"
