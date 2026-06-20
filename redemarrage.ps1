# PowerShell Script - Clean Restart (Fixed & Working)
# ====================================================
# A clean, reliable restart script for Next.js on Windows

# --- Configuration ---
$PROJECT_PATH = "C:\Users\tsall\Projects\Application Tirage Tarot\tarot_app\nextjs_space"
$NEXT_PORT = 3002
$BUILD_LOG = "$PROJECT_PATH\build.log"
$SERVER_LOG = "$PROJECT_PATH\server.log"

# --- Helper: Log Messages with Timestamp ---
function Write-TimestampedMessage {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor Green
}

# --- Phase 1: Stop Any Running Next.js Server ---
Write-TimestampedMessage "Stopping existing Next.js server..."
try {
    $nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $nodeProcesses | Stop-Process -Force
        Write-TimestampedMessage "Stopped $($nodeProcesses.Count) Node.js process(es)."
    } else {
        Write-TimestampedMessage "No running Node.js processes found."
    }
} catch {
    Write-TimestampedMessage "Warning: Could not stop Node.js processes."
}
Start-Sleep -Seconds 2

# --- Phase 2: Clean Rebuild ---
Write-TimestampedMessage "Cleaning .next and .cache..."
if (Test-Path "$PROJECT_PATH\.next") {
    Remove-Item "$PROJECT_PATH\.next" -Recurse -Force -ErrorAction SilentlyContinue
    Write-TimestampedMessage ".next cleaned."
}
if (Test-Path "$PROJECT_PATH\.cache") {
    Remove-Item "$PROJECT_PATH\.cache" -Recurse -Force -ErrorAction SilentlyContinue
    Write-TimestampedMessage ".cache cleaned."
}

# --- Phase 3: Install (if applicable) ---
if (Test-Path "$PROJECT_PATH\package-lock.json") {
    Write-TimestampedMessage "Installing/updating npm packages..."
    Push-Location $PROJECT_PATH
    npm install --silent
    Pop-Location
} else {
    Write-TimestampedMessage "package-lock.json not found; skipping npm install."
}

# --- Phase 4: Build Next.js using npm run build ---
Write-TimestampedMessage "Building Next.js application..."
Push-Location $PROJECT_PATH

# Use npm run build directly - simpler and works reliably
$buildOutput = npm run build --verbose
$buildOutput | Write-Host

if ($LASTEXITCODE -eq 0) {
    Write-TimestampedMessage "Build completed successfully."
    $buildOutput | Out-File -Append $BUILD_LOG -Encoding UTF8
} else {
    Write-Host "Build failed. Exit code: $LASTEXITCODE" -ForegroundColor Red
    $buildOutput | Out-File -Append $BUILD_LOG -Encoding UTF8
    Pop-Location
    exit 1
}
Pop-Location

# --- Phase 5: Start Next.js Server ---
Write-TimestampedMessage "Starting Next.js server on port $NEXT_PORT..."
Push-Location $PROJECT_PATH

# Use npm run start - this is the standard Next.js way
$env:NEXT_PORT = $NEXT_PORT
# Use npx to run next dev directly - more reliable than npm
$serverProc = Start-Process "C:\Program Files\nodejs\npx.cmd" -ArgumentList "next", "dev", "--port", "$NEXT_PORT" -PassThru -NoNewWindow

$serverPid = $serverProc.Id
Write-TimestampedMessage "Server started (PID: $serverPid)"
Pop-Location

# --- Phase 6: Test Server Health ---
Write-TimestampedMessage "Testing server health (waiting 3 seconds for startup)..."
Start-Sleep -Seconds 3

$serverReady = $false
$attempt = 0

while ($attempt -lt 15 -and -not $serverReady) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$NEXT_PORT/api/auth/update-account" `
            -Method POST -Headers @{ 'Content-Type' = 'application/json' } `
            -Body '{"email":"health-check@test.com"}' -TimeoutSec 10
        $serverReady = $true
        Write-Host "Health check successful at http://localhost:$NEXT_PORT" -ForegroundColor Green
    } catch {
        $attempt++
        Write-Host "  Attempt $attempt failed, retrying..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if (-not $serverReady) {
    Write-Host "`nServer startup failed after 15 attempts." -ForegroundColor Red
    Write-Host "Check $SERVER_LOG for diagnostic information." -ForegroundColor Yellow
    if (Test-Path $SERVER_LOG) {
        Get-Content $SERVER_LOG
    }
    if ($serverProc -and -not $serverProc.HasExited) {
        Write-Host "Stopping server process..." -ForegroundColor Yellow
        Stop-Process $serverProc -Force -ErrorAction SilentlyContinue
    }
    exit 1
}

# --- Success ---
Write-TimestampedMessage "Next.js is running and ready at http://localhost:$NEXT_PORT"
Write-TimestampedMessage "Application successfully restarted and ready for use!"

# Show last 20 lines of server log
Write-Host "`n--- Last 20 lines of server.log ---" -ForegroundColor Cyan
if (Test-Path $SERVER_LOG) {
    Get-Content $SERVER_LOG | Select-Object -Last 20 | ForEach-Object {
        Write-Host "  $_" -ForegroundColor White
    }
}

Write-Host "`nServer is running. Press Ctrl+C to stop." -ForegroundColor Green
Write-Host "Access the application at: http://localhost:$NEXT_PORT" -ForegroundColor Cyan

# Keep the script running to maintain the server process
while ($true) {
    Start-Sleep -Seconds 1
}

exit 0
