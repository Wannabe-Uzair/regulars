# Sourced by scripts/stall.sh and scripts/backup.sh: find the docker command, check Docker Desktop is running, and
# build the image. Docker Desktop can keep its command in ~/.docker/bin without adding that folder to the PATH, so
# look there too.

require_docker() {
  local dir
  if ! command -v docker >/dev/null 2>&1; then
    for dir in "$HOME/.docker/bin" /Applications/Docker.app/Contents/Resources/bin; do
      if [ -x "$dir/docker" ]; then
        export PATH="$dir:$PATH"
        break
      fi
    done
  fi
  if ! command -v docker >/dev/null 2>&1; then
    echo "The docker command isn't found. Install Docker Desktop and open it once, then open a new Terminal window and try again." >&2
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "Docker Desktop isn't running. Open it, wait until it says the engine is running, then try again." >&2
    exit 1
  fi
}

# Build the image (from the repo folder), or keep the one built last time when the build fails. Each build asks Docker
# Hub about the Node base image, so on a stall network with no internet it can fail even though nothing changed. The
# build's output goes to stderr, so a script's own output stays clean.
build_or_reuse() {
  local image
  docker compose build >&2 && return 0
  image="$(docker compose config --images)"
  if ! docker image inspect "$image" >/dev/null 2>&1; then
    echo "The build failed and there is no image from an earlier build. Connect this laptop to the internet and try again." >&2
    exit 1
  fi
  echo "The build failed (no internet, or a code change that doesn't build). Using the image built last time." >&2
}
