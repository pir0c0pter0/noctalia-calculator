#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "${SCRIPT_DIR}/.git" ]; then
  printf 'No git repository found in %s\n' "$SCRIPT_DIR" >&2
  printf 'Skipping git pull and re-running install only.\n'
  exec "${SCRIPT_DIR}/install.sh"
fi

git -C "$SCRIPT_DIR" pull --ff-only
exec "${SCRIPT_DIR}/install.sh"
