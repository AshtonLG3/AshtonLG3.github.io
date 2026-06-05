$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$publicSource = Resolve-Path (Join-Path $repoRoot 'public')
$assetsRoot = Join-Path $repoRoot 'android\supervisor-app\src\main\assets'
$publicTarget = Join-Path $assetsRoot 'public'
$configTarget = Join-Path $assetsRoot 'capacitor.config.json'

$resolvedAssetsRoot = Resolve-Path $assetsRoot
if (-not $resolvedAssetsRoot.Path.StartsWith($repoRoot.Path, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to sync outside repo: $resolvedAssetsRoot"
}

if (Test-Path $publicTarget) {
  $resolvedTarget = Resolve-Path $publicTarget
  if (-not $resolvedTarget.Path.StartsWith($resolvedAssetsRoot.Path, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove outside supervisor assets: $resolvedTarget"
  }
  Remove-Item -LiteralPath $resolvedTarget.Path -Recurse -Force
}

function Copy-RegularTree {
  param(
    [Parameter(Mandatory = $true)]
    [string] $SourceRoot,
    [Parameter(Mandatory = $true)]
    [string] $TargetRoot
  )

  $sourceRootFull = (Resolve-Path $SourceRoot).Path.TrimEnd('\')
  New-Item -ItemType Directory -Force -Path $TargetRoot | Out-Null

  Get-ChildItem -LiteralPath $sourceRootFull -Recurse -Force | ForEach-Object {
    $relativePath = $_.FullName.Substring($sourceRootFull.Length).TrimStart('\')
    $targetPath = Join-Path $TargetRoot $relativePath

    if ($_.PSIsContainer) {
      New-Item -ItemType Directory -Force -Path $targetPath | Out-Null
    } else {
      $targetDirectory = Split-Path -Parent $targetPath
      if (-not (Test-Path -LiteralPath $targetDirectory)) {
        New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null
      }

      $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
      [System.IO.File]::WriteAllBytes($targetPath, $bytes)
      (Get-Item -LiteralPath $targetPath).LastWriteTimeUtc = $_.LastWriteTimeUtc
    }
  }
}

function Copy-RegularFile {
  param(
    [Parameter(Mandatory = $true)]
    [string] $SourcePath,
    [Parameter(Mandatory = $true)]
    [string] $TargetPath
  )

  $targetDirectory = Split-Path -Parent $TargetPath
  if (-not (Test-Path -LiteralPath $targetDirectory)) {
    New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null
  }

  $bytes = [System.IO.File]::ReadAllBytes($SourcePath)
  [System.IO.File]::WriteAllBytes($TargetPath, $bytes)
  (Get-Item -LiteralPath $TargetPath).LastWriteTimeUtc = (Get-Item -LiteralPath $SourcePath).LastWriteTimeUtc
}

New-Item -ItemType Directory -Force -Path $publicTarget | Out-Null
@('supervisor.html', 'supervisor.js', 'dist.css') | ForEach-Object {
  Copy-RegularFile `
    -SourcePath (Join-Path $publicSource.Path $_) `
    -TargetPath (Join-Path $publicTarget $_)
}
Copy-RegularTree -SourceRoot (Join-Path $publicSource.Path 'icons') -TargetRoot (Join-Path $publicTarget 'icons')

$config = @{
  appId = 'com.employment.clocking.supervisor'
  appName = 'Supervisor Check Point'
  webDir = 'public'
}
$config | ConvertTo-Json | Set-Content -LiteralPath $configTarget -Encoding UTF8

Write-Host "Synced supervisor Android assets to $publicTarget"
