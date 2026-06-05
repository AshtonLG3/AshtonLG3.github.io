param(
  [int]$Port = 3000,
  [string]$TaskName = 'Employment Clocking Backend'
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$startScript = Join-Path $PSScriptRoot 'start-local-backend.ps1'
$powerShell = (Get-Command powershell.exe -ErrorAction Stop).Source
$taskArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`" -Port $Port"

function Install-StartupShortcut {
  $startupFolder = [Environment]::GetFolderPath('Startup')
  $shortcutPath = Join-Path $startupFolder "$TaskName.lnk"
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $powerShell
  $shortcut.Arguments = $taskArgs
  $shortcut.WorkingDirectory = $repoRoot
  $shortcut.WindowStyle = 7
  $shortcut.Description = 'Starts the Employment Clocking backend on Windows login.'
  $shortcut.Save()

  Start-Process -FilePath $powerShell -ArgumentList $taskArgs -WorkingDirectory $repoRoot -WindowStyle Hidden
  Write-Output "Installed Startup shortcut: $shortcutPath"
}

$installedScheduledTask = $false
try {
  $action = New-ScheduledTaskAction -Execute $powerShell -Argument $taskArgs -WorkingDirectory $repoRoot
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -MultipleInstances IgnoreNew `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Force | Out-Null

  Start-ScheduledTask -TaskName $TaskName
  $installedScheduledTask = $true
  Write-Output "Installed and started scheduled task '$TaskName'."
} catch {
  Write-Warning "Could not register the scheduled task: $($_.Exception.Message)"
  Install-StartupShortcut
}

try {
  $firewallRuleName = "Employment Clocking Backend Port $Port"
  $existingRule = Get-NetFirewallRule -DisplayName $firewallRuleName -ErrorAction SilentlyContinue
  if (-not $existingRule) {
    New-NetFirewallRule `
      -DisplayName $firewallRuleName `
      -Direction Inbound `
      -Action Allow `
      -Protocol TCP `
      -LocalPort $Port `
      -Profile Private | Out-Null
  }
} catch {
  Write-Warning "Could not create the Windows Firewall rule automatically. If phones cannot connect, allow inbound TCP port $Port on Private networks."
}

if ($installedScheduledTask) {
  Write-Output "The backend will start automatically when $env:USERNAME logs in."
} else {
  Write-Output "The backend will start automatically from the Startup folder when $env:USERNAME logs in."
}
