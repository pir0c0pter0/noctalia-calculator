#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "${SCRIPT_DIR}/.git" ]; then
  printf 'No git repository found in %s\n' "$SCRIPT_DIR" >&2
  printf 'Skipping git pull and re-running install only.\n'
  exec "${SCRIPT_DIR}/install.sh"
fi

if ! git -C "$SCRIPT_DIR" pull --ff-only; then
  printf 'Failed to pull updates. Your local copy may have diverged.\n' >&2
  printf 'Try: git -C "%s" pull --rebase\n' "$SCRIPT_DIR" >&2
  exit 1
fi

exec "${SCRIPT_DIR}/install.sh"
