# Statuz Rust Engine - Build & Test Script
# 用法: .\scripts\build.ps1 [release|debug]

param([string]$Mode = "debug")

$ErrorActionPreference = "Stop"
$ProjectDir = "d:\github projects\statuz\crates\statuz-core"

Write-Host "=== Statuz Rust Engine Build ===" -ForegroundColor Cyan

# 1. Build
Write-Host "`n[1/5] Building..." -ForegroundColor Yellow
Push-Location $ProjectDir
if ($Mode -eq "release") {
    cargo build --release
} else {
    cargo build
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Build: OK" -ForegroundColor Green

# 2. Self-Test
Write-Host "`n[2/5] Self-Test..." -ForegroundColor Yellow
cargo run -- self-test
if ($LASTEXITCODE -ne 0) {
    Write-Host "Self-Test failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Self-Test: OK" -ForegroundColor Green

# 3. Save/Load Roundtrip
Write-Host "`n[3/5] Save/Load Roundtrip..." -ForegroundColor Yellow
cargo run -- save --output test-cluster.stz
cargo run -- load --path test-cluster.stz
Write-Host "  Save/Load: OK" -ForegroundColor Green

# 4. Verify
Write-Host "`n[4/5] Verify Integrity..." -ForegroundColor Yellow
cargo run -- verify --path test-cluster.stz
Write-Host "  Verify: OK" -ForegroundColor Green

# 5. JSON Export
Write-Host "`n[5/5] JSON Export..." -ForegroundColor Yellow
cargo run -- export --path test-cluster.stz --output test-cluster.json
Write-Host "  Export: OK" -ForegroundColor Green

# Cleanup
Remove-Item -Force test-cluster.stz, test-cluster.json -ErrorAction SilentlyContinue

Pop-Location
Write-Host "`n=== All checks passed ===" -ForegroundColor Green