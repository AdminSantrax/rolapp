# Deploy.ps1 - Script to build and deploy rolapp to GitHub Pages
# ---------------------------------------------------------------
# Prerrequisitos:
#   - Node.js (v20+) e npm instalados y accesibles en PATH
#   - Git configurado con credenciales para el repositorio
#   - La rama 'main' ya contiene el código fuente
#   - La rama 'gh-pages' puede ser creada o ya existir

# 1. Instalar dependencias (solo la primera vez)
Write-Host "Instalando dependencias..."
npm install

# 2. Construir la aplicación con Vite (output en ./dist)
Write-Host "Construyendo la aplicación..."
npm run build

# 3. Forzar el commit del directorio dist en la rama gh-pages
#    Usamos la estrategia de subtree push para evitar crear un commit de merge.
Write-Host "Publicando en la rama gh-pages..."
# Asegurarse de que la rama gh-pages exista localmente
if (-not (git rev-parse --verify gh-pages 2>$null)) {
    git checkout -b gh-pages
} else {
    git checkout gh-pages
}
# Borrar contenido anterior y copiar dist
git rm -r . -f
Copy-Item -Recurse -Force "${PSScriptRoot}\dist\*" .
# Añadir y commitear
git add -f .
git commit -m "Deploy built site via PowerShell script"
# Push a remote
git push origin gh-pages --force
# Volver a la rama principal
git checkout main
Write-Host "Despliegue completado. Verifica en https://adminsantrax.github.io/rolapp/"
