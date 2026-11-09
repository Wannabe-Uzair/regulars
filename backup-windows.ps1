# Backs up or restores Regulars' data on Windows, as scripts/backup.sh does on the Mac.
# Run it from this folder:
#   powershell -ExecutionPolicy Bypass -File .\backup-windows.ps1 backup
#   powershell -ExecutionPolicy Bypass -File .\backup-windows.ps1 restore E:\tenure-2026-11-08-090000.db
# A backup goes into apps\api\data\backups in this folder, and is safe while the app runs.
# A restore needs the app stopped first (Ctrl+C in its window). It copies the file into the same backups folder,
# keeps a copy of the data it replaces there, and refuses a file that isn't a Regulars backup.
param(
  [Parameter(Position = 0)][string]$Command = '',
  [Parameter(Position = 1)][string]$File = '',
  [string]$TimeZone = 'Asia/Karachi'
)

Set-Location -Path $PSScriptRoot

function Stop-With([string]$Message) {
  Write-Host $Message
  exit 1
}

if ($Command -ne 'backup' -and $Command -ne 'restore') {
  Stop-With 'Usage: backup-windows.ps1 backup, or backup-windows.ps1 restore <file>'
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Stop-With 'Docker is not installed. Install Docker Desktop, start it, and run this again.'
}
docker info > $null 2> $null
if ($LASTEXITCODE -ne 0) {
  Stop-With 'Docker Desktop is not running. Start it, wait until it says the engine is running, and run this again.'
}

$volume = 'tenure-data'
if ($env:TENURE_VOLUME) { $volume = $env:TENURE_VOLUME }

$backups = Join-Path (Join-Path (Join-Path (Join-Path $PSScriptRoot 'apps') 'api') 'data') 'backups'
New-Item -ItemType Directory -Force -Path $backups | Out-Null
$backups = (Resolve-Path -LiteralPath $backups).Path

if ($Command -eq 'backup') {
  docker volume inspect $volume > $null 2> $null
  if ($LASTEXITCODE -ne 0) {
    Stop-With "There is no $volume volume yet, so there is nothing to back up. Start the app once with stall-windows.ps1."
  }
  $out = docker compose run --rm --no-deps -T -e "TZ=$TimeZone" -e 'TENURE_BACKUP_DIR=/backups' -v "${backups}:/backups" tenure node apps/api/src/ops/backup.ts
  if ($LASTEXITCODE -ne 0) { Stop-With 'The backup failed; see the lines above. Nothing was changed.' }
  $last = $out | Select-Object -Last 1
  $name = ($last -split '/')[-1]
  Write-Host ('Backed up to ' + (Join-Path $backups $name))
  exit 0
}

# restore
if (-not $File) {
  Stop-With 'Name the backup to restore, for example: backup-windows.ps1 restore E:\tenure-2026-11-08-090000.db'
}
if (-not (Test-Path -LiteralPath $File -PathType Leaf)) {
  Stop-With "No file at $File. Nothing was changed."
}
$running = docker compose ps --status running --quiet tenure 2> $null
if ($running) {
  Stop-With 'The app is running. Stop it first (Ctrl+C in its window), restore, then start it again with stall-windows.ps1. Nothing was changed.'
}
$full = (Resolve-Path -LiteralPath $File).Path
$leaf = Split-Path -Leaf $full
$inFolder = Join-Path $backups $leaf
if ($full -ne $inFolder) {
  Copy-Item -LiteralPath $full -Destination $inFolder -Force
}
docker compose run --rm --no-deps -T -e "TZ=$TimeZone" -e 'TENURE_BACKUP_DIR=/backups' -v "${backups}:/backups" tenure node apps/api/src/ops/restore.ts "/backups/$leaf"
if ($LASTEXITCODE -ne 0) { Stop-With 'The restore refused or failed; see the lines above. Nothing was changed.' }
Write-Host 'Restored. Start the app again with stall-windows.ps1.'
