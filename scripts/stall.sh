#!/usr/bin/env bash
# Run Tenure in Docker for the stall: find this laptop's LAN address, pass it in, start compose.
set -euo pipefail

# require_docker: finds the docker command, and stops with a plain message when Docker Desktop is not running.
. "$(dirname "${BASH_SOURCE[0]}")/docker-cli.sh"

# The IPv4 address of a macOS interface (en0, say), or nothing.
mac_ifaddr() {
  command -v ipconfig >/dev/null 2>&1 || return 0
  ipconfig getifaddr "$1" 2>/dev/null || true
}

# This laptop's LAN address, or nothing: the default route's interface first, then en0 and en1.
detect_lan() {
  local ip="" iface=""
  if [ "$(uname -s)" = Darwin ]; then
    iface="$(route -n get default 2>/dev/null | awk '$1 == "interface:" { print $2; exit }' || true)"
    [ -z "$iface" ] || ip="$(mac_ifaddr "$iface")"
  else
    if command -v ip >/dev/null 2>&1; then
      ip="$(ip route get 1.1.1.1 2>/dev/null | awk '{ for (i = 1; i < NF; i++) if ($i == "src") { print $(i + 1); exit } }' || true)"
    fi
    [ -n "$ip" ] || ip="$(hostname -I 2>/dev/null | awk '{ print $1 }' || true)"
  fi
  [ -n "$ip" ] || ip="$(mac_ifaddr en0)"
  [ -n "$ip" ] || ip="$(mac_ifaddr en1)"
  printf '%s' "$ip"
}

# The addresses to hand the server: TENURE_LAN_IPS when it is already set, otherwise the detected one.
lan_ips() {
  if [ -n "${TENURE_LAN_IPS:-}" ]; then
    printf '%s' "$TENURE_LAN_IPS"
  else
    detect_lan
  fi
}

# This laptop's time zone name (for example America/Chicago), from the /etc/localtime link on macOS and Linux.
detect_tz() {
  local link
  link="$(readlink /etc/localtime 2>/dev/null || true)"
  printf '%s' "${link##*/zoneinfo/}"
}

main() {
  require_docker
  cd "$(dirname "$0")/.."
  local ips tz port="${TENURE_PORT:-5175}"
  ips="$(lan_ips)"
  if [ -n "$ips" ]; then
    export TENURE_LAN_IPS="$ips"
    echo "Phones on this network can open http://${ips%%,*}:$port"
  else
    echo "No LAN address found. Continuing; the server will print localhost only." >&2
  fi
  # A container runs in UTC, so a demo gym seeded there would be a day off at night. Seed it in this laptop's zone,
  # unless TENURE_TZ is already set.
  tz="${TENURE_TZ:-$(detect_tz)}"
  if [ -n "$tz" ]; then
    export TENURE_TZ="$tz"
    echo "A first seed uses the time zone $tz. A demo gym that already exists keeps the zone it was seeded with."
  fi
  build_or_reuse
  docker compose up "$@"
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main "$@"
fi
