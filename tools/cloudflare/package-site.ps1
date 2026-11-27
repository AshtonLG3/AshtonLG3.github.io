param(
  [Parameter(Mandatory)]
  [string]$Output,
  [string]$Revision = 'HEAD'
)

$ErrorActionPreference = 'Stop'
$repo = Resolve-Path (Join-Path $PSScriptRoot '../..')
$zipPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Output)
git -C $repo archive --format=zip "--output=$zipPath" $Revision -- . ':(exclude).github' ':(exclude).gitignore' ':(exclude)CNAME' ':(exclude)tools' ':(exclude)flyer_files'
if ($LASTEXITCODE -ne 0) {
  throw 'Could not archive the website revision.'
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::Open($zipPath, [IO.Compression.ZipArchiveMode]::Update)
try {
  $videoPaths = @($zip.Entries | Where-Object { $_.FullName.EndsWith('.mp4') } | ForEach-Object { '/' + $_.FullName })
  if ($videoPaths.Count -eq 0 -or $videoPaths.Count -gt 100) {
    throw 'The site must contain between 1 and 100 video routes.'
  }

  foreach ($name in @('_worker.js', '_headers', '404.html')) {
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $PSScriptRoot $name), $name) | Out-Null
  }

  $routes = @{ version = 1; include = $videoPaths; exclude = @() } | ConvertTo-Json -Depth 3
  $writer = [IO.StreamWriter]::new($zip.CreateEntry('_routes.json').Open())
  try {
    $writer.Write($routes)
  } finally {
    $writer.Dispose()
  }
} finally {
  $zip.Dispose()
}
