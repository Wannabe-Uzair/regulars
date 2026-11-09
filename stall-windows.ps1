# Starts Regulars in Docker on Windows for the stall, as scripts/stall.sh does on the Mac.
# Run it from this folder:
#   powershell -ExecutionPolicy Bypass -File .\stall-windows.ps1
# Join the stall's Wi-Fi (the hotspot) first: the phone links and QR codes use this laptop's address on it.
# If it finds the wrong address, give the right one (from ipconfig):
#   powershell -ExecutionPolicy Bypass -File .\stall-windows.ps1 -Address 172.20.10.4
# It runs the ready-made build in regulars-image-amd64.tar.gz (the 8 Nov build, made and tested on the Mac mini). The
# first start loads it into Docker, with no internet needed. -Build builds from this folder instead (online, minutes):
#   powershell -ExecutionPolicy Bypass -File .\stall-windows.ps1 -Build
param(
  [string]$Address = '',
  [string]$Country = 'US',
  [string]$TimeZone = 'Asia/Karachi',
  [int]$Port = 5175,
  [switch]$Build
)

Set-Location -Path $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host 'Docker is not installed. Install Docker Desktop, start it, and run this again.'
  exit 1
}
docker info > $null 2> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Docker Desktop is not running. Start it, wait until it says the engine is running, and run this again.'
  exit 1
}

# This laptop's address on the network it is joined to: the adapter with a default gateway first, then any other
# real IPv4 address (not loopback, not self-assigned, not the WSL or Docker adapters).
$ip = $Address
if (-not $ip -and (Get-Command Get-NetIPConfiguration -ErrorAction SilentlyContinue)) {
  try {
    $cfg = Get-NetIPConfiguration -ErrorAction Stop |
      Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } |
      Select-Object -First 1
    if ($cfg) { $ip = ($cfg.IPv4Address | Select-Object -First 1).IPAddress }
  } catch { }
}
if (-not $ip -and (Get-Command Get-NetIPAddress -ErrorAction SilentlyContinue)) {
  $addr = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notmatch 'vEthernet|WSL|Docker|Loopback' } |
    Select-Object -First 1
  if ($addr) { $ip = $addr.IPAddress }
}

$env:TENURE_COUNTRY = $Country
$env:TENURE_TZ = $TimeZone
$env:TENURE_PORT = "$Port"
if ($ip) {
  $env:TENURE_LAN_IPS = $ip
  Write-Host "Phones on this network can open http://${ip}:$Port"
} else {
  Write-Host 'No network address found. Continuing; the server will print localhost only.'
}
Write-Host "A first start sets up the sample gym as a $Country gym in the time zone $TimeZone."
Write-Host 'A gym that already exists, or one restored from the Air, keeps its own.'

# The image compose runs (tenure-tenure), and the ready-made one that becomes it.
$image = docker compose config --images | Select-Object -First 1
$readyImage = 'regulars:3c771a7-amd64'
$readyFile = Join-Path $PSScriptRoot 'regulars-image-amd64.tar.gz'

$ready = $false
if (-not $Build) {
  docker image inspect $readyImage > $null 2> $null
  if ($LASTEXITCODE -ne 0 -and (Test-Path -LiteralPath $readyFile)) {
    Write-Host 'Loading the ready-made build into Docker. This takes a minute or two, the first time only.'
    docker load -i $readyFile
    if ($LASTEXITCODE -ne 0) { Write-Host 'Loading the ready-made build failed. Building from this folder instead.' }
  }
  docker image inspect $readyImage > $null 2> $null
  if ($LASTEXITCODE -eq 0) {
    docker tag $readyImage $image
    if ($LASTEXITCODE -eq 0) { $ready = $true }
  }
}

if (-not $ready) {
  docker compose build
  if ($LASTEXITCODE -ne 0) {
    docker image inspect $image > $null 2> $null
    if ($LASTEXITCODE -ne 0) {
      Write-Host 'The build failed and there is no earlier build. Connect this laptop to the internet and run this again.'
      exit 1
    }
    Write-Host 'The build failed (no internet, most likely). Using the build from last time.'
  }
}

# Which build runs: the ready-made one carries its commit as a label; one built here has none.
$labels = docker image inspect $image --format '{{json .Config.Labels}}' 2> $null | ConvertFrom-Json
$revision = ''
if ($labels) { $revision = $labels.'org.opencontainers.image.revision' }
if ($revision) {
  Write-Host "Running the ready-made build of 8 Nov ($revision)."
} else {
  Write-Host 'Running a build made on this laptop from this folder.'
}
Write-Host 'Before the doors open, drag stall-check.html onto Chrome: it says whether the animations will play.'

docker compose up --no-build
