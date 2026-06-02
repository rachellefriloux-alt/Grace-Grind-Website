$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $ProjectRoot "logs"
$OutLog = Join-Path $LogDir "website-out.log"
$ErrLog = Join-Path $LogDir "website-error.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location $ProjectRoot

if (-not $env:PORT) {
  $env:PORT = "3000"
}

$npm = (Get-Command npm.cmd -ErrorAction Stop).Source

if (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
  Add-Content -Path $OutLog -Value "[$(Get-Date -Format s)] Installing dependencies"
  & $npm install >> $OutLog 2>> $ErrLog
}

if (-not (Test-Path (Join-Path $ProjectRoot "dist\index.js"))) {
  Add-Content -Path $OutLog -Value "[$(Get-Date -Format s)] Building website"
  & $npm run build >> $OutLog 2>> $ErrLog
}

while ($true) {
  $healthUrl = "http://127.0.0.1:$env:PORT/health"

  try {
    Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 3 | Out-Null
    Start-Sleep -Seconds 30
    continue
  } catch {
    # No healthy server responded on this port, so start one below.
  }

  Add-Content -Path $OutLog -Value "[$(Get-Date -Format s)] Starting Grace & Grind website on port $env:PORT"

  try {
    & $npm start >> $OutLog 2>> $ErrLog
    $exitCode = $LASTEXITCODE
    Add-Content -Path $ErrLog -Value "[$(Get-Date -Format s)] Website process exited with code $exitCode. Restarting in 5 seconds."
  } catch {
    Add-Content -Path $ErrLog -Value "[$(Get-Date -Format s)] Website process failed: $($_.Exception.Message). Restarting in 5 seconds."
  }

  Start-Sleep -Seconds 5
}
