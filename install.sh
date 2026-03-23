#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ID="noctalia-calculator"
PLUGIN_DIR_NAME="$PLUGIN_ID"
CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
NOCTALIA_DIR="${CONFIG_HOME}/noctalia"
PLUGINS_DIR="${NOCTALIA_DIR}/plugins"
TARGET_DIR="${PLUGINS_DIR}/${PLUGIN_DIR_NAME}"
PLUGINS_FILE="${NOCTALIA_DIR}/plugins.json"
SETTINGS_FILE="${NOCTALIA_DIR}/settings.json"
NIRI_KEYBINDS_FILE="${CONFIG_HOME}/niri/cfg/keybinds.kdl"

mkdir -p "$PLUGINS_DIR"

if [ -e "$TARGET_DIR" ] && [ ! -L "$TARGET_DIR" ] && [ "$(cd "$TARGET_DIR" && pwd)" != "$SCRIPT_DIR" ]; then
  printf 'Refusing to overwrite existing directory: %s\n' "$TARGET_DIR" >&2
  exit 1
fi

if [ "$SCRIPT_DIR" != "$TARGET_DIR" ]; then
  ln -sfn "$SCRIPT_DIR" "$TARGET_DIR"
  # Verify symlink points where intended
  actual_target="$(readlink -f "$TARGET_DIR")"
  if [ "$actual_target" != "$SCRIPT_DIR" ]; then
    printf 'Symlink verification failed. Expected %s, got %s\n' "$SCRIPT_DIR" "$actual_target" >&2
    exit 1
  fi
fi

python3 - "$PLUGINS_FILE" "$SETTINGS_FILE" "$PLUGIN_ID" "$SCRIPT_DIR" <<'PY'
import sys
sys.path.insert(0, sys.argv[4])
from _utils import load_json, save_json

plugins_file, settings_file, plugin_id = sys.argv[1:4]

plugins = load_json(plugins_file, {})
plugins[plugin_id] = {
    "enabled": True,
    "sourceUrl": ""
}
save_json(plugins_file, plugins)

settings = load_json(settings_file, {})
bar = settings.setdefault("bar", {})
widgets = bar.setdefault("widgets", {})
right = widgets.setdefault("right", [])

widget_entry = {
    "id": f"plugin:{plugin_id}",
    "commandPrefix": "calculator",
    "defaultSettings": {
        "language": "auto",
        "precision": 8,
        "showBarValue": True
    }
}

if not any(item.get("id") == widget_entry["id"] for item in right if isinstance(item, dict)):
    right.append(widget_entry)

save_json(settings_file, settings)
PY

python3 - "$NIRI_KEYBINDS_FILE" "$SCRIPT_DIR" <<'PY'
import os
import re
import sys

sys.path.insert(0, sys.argv[2])
from _utils import save_file

keybinds_file = sys.argv[1]
start_marker = "// >>> noctalia-calculator start >>>"
end_marker = "// <<< noctalia-calculator end <<<"
binding_line = '    Mod+Shift+C                         hotkey-overlay-title="Calculator: noctalia-calculator" { spawn-sh "qs -c noctalia-shell ipc call plugin togglePanel noctalia-calculator"; }'
managed_block = "\n".join((start_marker, binding_line, end_marker))

if not os.path.exists(keybinds_file):
    print(f'Skipped Niri keybind install: {keybinds_file} not found')
    raise SystemExit(0)

with open(keybinds_file, "r", encoding="utf-8") as handle:
    content = handle.read()

managed_pattern = re.compile(
    r'(?ms)^[ \t]*// >>> noctalia-calculator start >>>\n.*?^[ \t]*// <<< noctalia-calculator end <<<\n?'
)
exact_binding = 'qs -c noctalia-shell ipc call plugin togglePanel noctalia-calculator'
# Exclude commented-out lines when checking for conflicting bindings
conflicting_binding = re.search(r'^(?![ \t]*//)[ \t]*Mod\+Shift\+C\b.*$', content, re.MULTILINE)

if managed_pattern.search(content):
    updated = managed_pattern.sub(managed_block + "\n", content, count=1)
    if updated != content:
        save_file(keybinds_file, updated)
    print('Ensured Niri keybind: Mod+Shift+C')
    raise SystemExit(0)

if exact_binding in content:
    print('Niri keybind already present: Mod+Shift+C')
    raise SystemExit(0)

if conflicting_binding:
    print('Skipped Niri keybind install: Mod+Shift+C is already mapped to another command')
    raise SystemExit(0)

# Verify we find a binds block (flexible whitespace matching)
if not re.search(r'binds\s*\{', content):
    print('Skipped Niri keybind install: could not find a binds block in keybinds.kdl')
    raise SystemExit(0)

binds_close = content.rfind("}")
if binds_close == -1:
    print('Skipped Niri keybind install: could not find closing brace in keybinds.kdl')
    raise SystemExit(0)

prefix = content[:binds_close].rstrip("\n")
suffix = content[binds_close:].lstrip("\n")
updated = prefix + "\n\n" + managed_block + "\n\n" + suffix
save_file(keybinds_file, updated)
print('Installed Niri keybind: Mod+Shift+C')
PY

printf 'Installed %s\n' "$PLUGIN_ID"
printf 'Plugin path: %s\n' "$TARGET_DIR"
