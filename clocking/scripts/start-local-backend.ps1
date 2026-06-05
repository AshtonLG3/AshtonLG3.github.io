param(
  [int]$Port = 3000,
  [string]$PublicBaseUrl = $env:PUBLIC_BASE_URL
)

$ErrorActionPreference = 'Stop'

function Get-ClockingLanIp {
  $candidates = foreach ($network in [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
    if ($network.OperationalStatus -ne [System.Net.NetworkInformation.OperationalStatus]::Up) {
      continue
    }

    if ($network.NetworkInterfaceType -eq [System.Net.NetworkInformation.NetworkInterfaceType]::Loopback) {
      continue
    }

    $properties = $network.GetIPProperties()
    $hasGateway = @($properties.GatewayAddresses | Where-Object {
      $_.Address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and $_.Address.ToString() -ne '0.0.0.0'
    }).Count -gt 0

    foreach ($address in $properties.UnicastAddresses) {
      if ($address.Address.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
        continue
      }

      $ip = $address.Address.ToString()
      if ($ip -like '127.*' -or $ip -like '169.254.*') {
        continue
      }

      $score = 30
      if ($hasGateway -and $ip -notmatch '^100\.') {
        $score = 0
      } elseif ($ip -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)') {
        $score = 10
      } elseif ($ip -match '^100\.') {
        $score = 20
      }

      [pscustomobject]@{
        IPAddress = $ip
        Score = $score
        InterfaceName = $network.Name
      }
    }
  }

  $selected = $candidates | Sort-Object Score, InterfaceName | Select-Object -First 1
  if (-not $selected) {
    return '127.0.0.1'
  }

  return $selected.IPAddress
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

if (-not $PublicBaseUrl) {
  $lanIp = Get-ClockingLanIp
  $PublicBaseUrl = "http://${lanIp}:$Port"
}

$env:PORT = [string]$Port
$env:PUBLIC_BASE_URL = $PublicBaseUrl

$logDir = Join-Path $repoRoot 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir 'local-backend.log'

try {
  $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/" -TimeoutSec 3
  if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
    "Employment Clocking backend is already running at http://127.0.0.1:$Port/" | Tee-Object -FilePath $logFile -Append
    "Phone/LAN URL: $PublicBaseUrl" | Tee-Object -FilePath $logFile -Append
    exit 0
  }
} catch {
  "Starting Employment Clocking backend at $PublicBaseUrl" | Tee-Object -FilePath $logFile -Append
}

$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
& $npm start *>&1 | Tee-Object -FilePath $logFile -Append
