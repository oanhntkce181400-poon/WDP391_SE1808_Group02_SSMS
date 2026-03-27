#!/usr/bin/env pwsh

# Quick fix script for Metro cache and auth errors
# Run this in mobile-app folder

param(
    [switch]$FullClean = $false,
    [switch]$NoStart = $false
)

$appPath = Get-Location
$reset = if ($FullClean) { "--reset-cache" } else { "" }

Write-Host "
╔════════════════════════════════════════════════════════════════╗
║          METRO CACHE & AUTH ERRORS FIX                         ║
║          Mobile App Quick Recovery                             ║
╚════════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

# Step 1: Clear Metro cache
Write-Host "`n[1/5] 🧹 Clearing Metro cache..." -ForegroundColor Yellow
$cacheItems = @(
    "node_modules\.cache",
    ".expo",
    "tmp"
)

foreach ($item in $cacheItems) {
    if (Test-Path $item) {
        Remove-Item -Path $item -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✅ Removed $item" -ForegroundColor Green
    }
}

# Step 2: Clear npm cache
Write-Host "`n[2/5] 🔧 Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force 2>$null
Write-Host "  ✅ npm cache cleared" -ForegroundColor Green

# Step 3: Kill node processes
Write-Host "`n[3/5] 🛑 Stopping existing processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "  ✅ Stopped $($nodeProcesses.Count) Node process(es)" -ForegroundColor Green
    Start-Sleep -Seconds 2
}

# Step 4: Check dependencies
Write-Host "`n[4/5] 📦 Verifying dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "  ⓘ node_modules not found, installing..." -ForegroundColor Cyan
    npm install
    Write-Host "  ✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ✅ Dependencies already installed" -ForegroundColor Green
}

# Step 5: Start Metro
Write-Host "`n[5/5] 🚀 Starting Metro bundler..." -ForegroundColor Yellow
if ($NoStart) {
    Write-Host "  ⓘ Skipped Metro start (--NoStart flag set)" -ForegroundColor Cyan
} else {
    Write-Host "  Starting: npm start $reset`n" -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
    
    if ($reset) {
        npm start -- $reset
    } else {
        npm start
    }
}

Write-Host "`n✅ Fix script completed!" -ForegroundColor Green
