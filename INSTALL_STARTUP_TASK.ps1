$ErrorActionPreference = "Stop"

$TaskName = "Grace Grind Website"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Runner = Join-Path $ProjectRoot "KEEP_WEBSITE_RUNNING.ps1"

if (-not (Test-Path $Runner)) {
  throw "Could not find $Runner"
}

function Install-StartupShortcut {
  $startup = [Environment]::GetFolderPath("Startup")
  $vbsPath = Join-Path $startup "Grace Grind Website.vbs"
  $escapedRunner = $Runner.Replace('"', '""')
  $vbs = @"
Set shell = CreateObject("WScript.Shell")
shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""$escapedRunner""", 0, False
"@

  Set-Content -Path $vbsPath -Value $vbs -Encoding ASCII
  Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Runner`"" -WindowStyle Hidden

  Write-Host "Installed the user startup shortcut:"
  Write-Host $vbsPath
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Runner`"" `
  -WorkingDirectory $ProjectRoot

$trigger = New-ScheduledTaskTrigger -AtLogOn

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit (New-TimeSpan -Days 0)

try {
  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Keeps the Grace & Grind website running from C:\Grace-Grind-Website." `
    -Force | Out-Null

  Start-ScheduledTask -TaskName $TaskName
  Write-Host "Installed and started the '$TaskName' startup task."
} catch {
  Write-Host "Could not install the Scheduled Task: $($_.Exception.Message)"
  Write-Host "Falling back to the current user's Startup folder."
  Install-StartupShortcut
}

Write-Host "Local site: http://localhost:3000"
Write-Host "Logs: $ProjectRoot\logs"
