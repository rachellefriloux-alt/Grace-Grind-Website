$ErrorActionPreference = "Stop"

$TaskName = "Grace Grind Website"

try {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Removed the '$TaskName' startup task."
  } else {
    Write-Host "No '$TaskName' startup task was installed."
  }
} catch {
  Write-Host "Could not check Scheduled Tasks: $($_.Exception.Message)"
}

$startup = [Environment]::GetFolderPath("Startup")
$vbsPath = Join-Path $startup "Grace Grind Website.vbs"

if (Test-Path $vbsPath) {
  Remove-Item -LiteralPath $vbsPath -Force
  Write-Host "Removed the Startup folder launcher:"
  Write-Host $vbsPath
}
