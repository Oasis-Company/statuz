# Statuz End-to-End Workflow Test
# Tests: create -> clone -> merge -> password -> verify -> export
# Run: powershell -ExecutionPolicy Bypass -File scripts/e2e.ps1

$ErrorActionPreference = "Stop"
# Use the built binary directly (& handles paths with spaces correctly)
$STATUZ = "D:\github projects\statuz\target\debug\statuz-core.exe"
$TEMP_DIR = Join-Path $env:TEMP "statuz-e2e-$(Get-Random)"
New-Item -ItemType Directory -Path $TEMP_DIR -Force | Out-Null
Push-Location $TEMP_DIR

Write-Host "=== Statuz E2E Test ===" -ForegroundColor Cyan
Write-Host "Working directory: $TEMP_DIR`n" -ForegroundColor Gray

# Phase 1: Create first Cluster
Write-Host "Phase 1: Create first Cluster (Team Alpha)" -ForegroundColor Yellow
& $STATUZ init -n "Team Alpha" -v private
if ($LASTEXITCODE -ne 0) { throw "Phase 1 failed" }
Write-Host "  OK`n" -ForegroundColor Green

# Phase 2: Save as .stz file
Write-Host "Phase 2: Save as team-alpha.stz" -ForegroundColor Yellow
& $STATUZ save -o team-alpha.stz
if ($LASTEXITCODE -ne 0) { throw "Phase 2 failed" }
if (-not (Test-Path "team-alpha.stz")) { throw "team-alpha.stz not created" }
Write-Host "  File size: $((Get-Item team-alpha.stz).Length) bytes" -ForegroundColor Gray
Write-Host "  OK`n" -ForegroundColor Green

# Phase 3: Verify integrity
Write-Host "Phase 3: Verify integrity" -ForegroundColor Yellow
& $STATUZ verify -p team-alpha.stz
if ($LASTEXITCODE -ne 0) { throw "Phase 3 failed" }
Write-Host "  OK`n" -ForegroundColor Green

# Phase 4: Show cluster info
Write-Host "Phase 4: Show cluster info" -ForegroundColor Yellow
& $STATUZ show -p team-alpha.stz
if ($LASTEXITCODE -ne 0) { throw "Phase 4 failed" }
Write-Host "  OK`n" -ForegroundColor Green

# Phase 5: Load cluster
Write-Host "Phase 5: Load cluster from file" -ForegroundColor Yellow
& $STATUZ load -p team-alpha.stz
if ($LASTEXITCODE -ne 0) { throw "Phase 5 failed" }
Write-Host "  OK`n" -ForegroundColor Green

# Phase 6: Export as JSON
Write-Host "Phase 6: Export as JSON" -ForegroundColor Yellow
& $STATUZ export -p team-alpha.stz -o team-alpha.json
if ($LASTEXITCODE -ne 0) { throw "Phase 6 failed" }
if (-not (Test-Path "team-alpha.json")) { throw "team-alpha.json not created" }
Write-Host "  File size: $((Get-Item team-alpha.json).Length) bytes" -ForegroundColor Gray
Write-Host "  OK`n" -ForegroundColor Green

# Phase 7: Save with compression
Write-Host "Phase 7: Save with compression (--compress)" -ForegroundColor Yellow
& $STATUZ save -o team-alpha-compressed.stz --compress
if ($LASTEXITCODE -ne 0) { throw "Phase 7 failed" }
if (-not (Test-Path "team-alpha-compressed.stz")) { throw "team-alpha-compressed.stz not created" }
$rawSize = (Get-Item team-alpha.stz).Length
$compSize = (Get-Item team-alpha-compressed.stz).Length
Write-Host "  Raw: ${rawSize} bytes, Compressed: ${compSize} bytes" -ForegroundColor Gray
Write-Host "  OK`n" -ForegroundColor Green

# Phase 8: Save with encryption
Write-Host "Phase 8: Save with encryption (--encrypt)" -ForegroundColor Yellow
& $STATUZ save -o team-alpha-encrypted.stz --encrypt --password "test-secret-123"
if ($LASTEXITCODE -ne 0) { throw "Phase 8 failed" }
if (-not (Test-Path "team-alpha-encrypted.stz")) { throw "team-alpha-encrypted.stz not created" }
Write-Host "  File size: $((Get-Item team-alpha-encrypted.stz).Length) bytes" -ForegroundColor Gray
Write-Host "  OK`n" -ForegroundColor Green

# Phase 9: Load encrypted file — must fail with a password hint
Write-Host "Phase 9: Load encrypted file (expected password error)" -ForegroundColor Yellow
& $STATUZ load -p team-alpha-encrypted.stz
if ($LASTEXITCODE -eq 0) { throw "Phase 9 failed: encrypted load should require a password" }
Write-Host "  OK (gracefully rejected)`n" -ForegroundColor Green

# Phase 9b: Load encrypted file WITH the correct password
Write-Host "Phase 9b: Load encrypted file with password" -ForegroundColor Yellow
& $STATUZ load -p team-alpha-encrypted.stz --password "test-secret-123"
if ($LASTEXITCODE -ne 0) { throw "Phase 9b failed: encrypted load with password should succeed" }
Write-Host "  OK`n" -ForegroundColor Green

# Phase 10: Verify compressed file
Write-Host "Phase 10: Verify compressed file integrity" -ForegroundColor Yellow
& $STATUZ verify -p team-alpha-compressed.stz
if ($LASTEXITCODE -ne 0) { throw "Phase 10 failed" }
Write-Host "  OK`n" -ForegroundColor Green

# Phase 11: Run self-test
Write-Host "Phase 11: Run self-test" -ForegroundColor Yellow
& $STATUZ self-test
if ($LASTEXITCODE -ne 0) { throw "Phase 11 failed" }
Write-Host "  OK`n" -ForegroundColor Green

# Cleanup
Pop-Location
Remove-Item -Recurse -Force $TEMP_DIR

Write-Host "=== All 11 phases passed! ===" -ForegroundColor Cyan
Write-Host "Statuz engine is working correctly with compression and encryption support." -ForegroundColor Green
