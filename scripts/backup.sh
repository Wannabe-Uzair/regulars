#!/usr/bin/env bash
# Back up or restore the Docker database: the tenure-data volume that scripts/stall.sh and compose.yaml use.
#   scripts/backup.sh backup [folder]   copy it to a dated file in folder (apps/api/data/backups by default), safely
#                                       while the container runs
#   scripts/backup.sh restore <file>    replace it with a backup, keeping the one it replaces in apps/api/data/backups;
#                                       refused while the container runs. The next start migrates it as usual.
# Each runs npm run backup's or npm run restore's command in a one-off container of the same image, with the volume at
# /data and the folders it needs mounted at their own paths, so every path it prints is one on this laptop.
set -euo pipefail

# require_docker: finds the docker command, and stops with a plain message when Docker Desktop is not running.
. "$(dirname "${BASH_SOURCE[0]}")/docker-cli.sh"

# compose.yaml's volume: tenure-data, unless TENURE_VOLUME names another (a trial run's).
VOLUME="${TENURE_VOLUME:-tenure-data}"
BACKUPS=apps/api/data/backups

usage() {
  echo "Usage: scripts/backup.sh backup [folder], or scripts/backup.sh restore <file>" >&2
  exit 1
}

# This laptop's time zone name (for example America/Chicago), so a backup is named for the time on the wall.
detect_tz() {
  local link
  link="$(readlink /etc/localtime 2>/dev/null || true)"
  printf '%s' "${link##*/zoneinfo/}"
}

# The absolute path of a folder, made if it's missing.
folder_path() {
  mkdir -p "$1"
  (cd "$1" && pwd)
}

# True while the compose service is up, and so the server has the database open.
container_running() {
  [ -n "$(docker compose ps --status running --quiet tenure 2>/dev/null)" ]
}

# Run a command in a one-off container (rebuilt first if the code changed, or the last image when the build fails) with
# the volume, and the backups folder `$1` mounted at its own path as TENURE_BACKUP_DIR. Further `docker compose run`
# options may follow, then `--` and the command.
in_container() {
  local backups="$1" tz
  shift
  local options=()
  while [ "$1" != "--" ]; do
    options+=("$1")
    shift
  done
  shift
  tz="${TZ:-$(detect_tz)}"
  build_or_reuse
  docker compose run --rm --no-deps -T \
    -e TZ="${tz:-UTC}" -e TENURE_BACKUP_DIR="$backups" -v "$backups:$backups" ${options[@]+"${options[@]}"} \
    tenure "$@"
}

# Back the volume's database up into the folder `$1`, and print the file's path.
backup() {
  if ! docker volume inspect "$VOLUME" >/dev/null 2>&1; then
    echo "There is no $VOLUME volume yet, so there is nothing to back up. Start the stall once with scripts/stall.sh." >&2
    exit 1
  fi
  in_container "$1" -- node apps/api/src/ops/backup.ts
}

# Restore the backup at the absolute path `$1` into the volume.
restore() {
  local file="$1" dir src
  if container_running; then
    echo "The tenure container is running. Stop it first (docker compose stop), restore, then start it again with scripts/stall.sh. Nothing was changed." >&2
    exit 1
  fi
  dir="$(folder_path "$BACKUPS")"
  src="$(dirname "$file")"
  # A file outside the backups folder gets its own folder mounted, read-only.
  if [ "$src" = "$dir" ]; then
    in_container "$dir" -- node apps/api/src/ops/restore.ts "$file"
  else
    in_container "$dir" -v "$src:$src:ro" -- node apps/api/src/ops/restore.ts "$file"
  fi
}

main() {
  [ "$#" -ge 1 ] || usage
  require_docker
  local command="$1" root
  shift
  root="$(cd "$(dirname "$0")/.." && pwd)"
  # Paths given are read from where the script was started; compose runs from the repo.
  case "$command" in
    backup)
      [ "$#" -le 1 ] || usage
      local dir=""
      [ "$#" -eq 0 ] || dir="$(folder_path "$1")"
      cd "$root"
      backup "${dir:-$(folder_path "$BACKUPS")}"
      ;;
    restore)
      [ "$#" -eq 1 ] || usage
      if [ ! -f "$1" ]; then
        echo "No file at $1. Nothing was changed." >&2
        exit 1
      fi
      local file
      file="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
      cd "$root"
      restore "$file"
      ;;
    *) usage ;;
  esac
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main "$@"
fi
