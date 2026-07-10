$ErrorActionPreference = "Stop"

Write-Host "Preparing Velunee development environment..." -ForegroundColor Magenta

corepack enable
corepack prepare pnpm@11.11.0 --activate
pnpm install

if (-not (Test-Path "apps/api/.env")) {
  Copy-Item "apps/api/.env.example" "apps/api/.env"
}

if (-not (Test-Path "apps/mobile/.env")) {
  Copy-Item "apps/mobile/.env.example" "apps/mobile/.env"
}

Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Terminal 1: pnpm dev:api"
Write-Host "Terminal 2: pnpm dev:mobile"
