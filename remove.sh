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

python3 - "$PLUGINS_FILE" "$SETTINGS_FILE" "$PLUGIN_ID" "$SCRIPT_DIR" <<'PY'
import sys
sys.path.insert(0, sys.argv[4])
from _utils import load_json, save_json

plugins_file, settings_file, plugin_id = sys.argv[1:4]
widget_id = f"plugin:{plugin_id}"

plugins = load_json(plugins_file, {})
if plugin_id in plugins:
    del plugins[plugin_id]
    save_json(plugins_file, plugins)

settings = load_json(settings_file, {})
bar = settings.get("bar", {})
widgets = bar.get("widgets", {})

for section in ("left", "center", "right"):
    items = widgets.get(section)
    if isinstance(items, list):
        widgets[section] = [
            item for item in items
            if not (isinstance(item, dict) and item.get("id") == widget_id)
        ]

save_json(settings_file, settings)
PY

python3 - "$NIRI_KEYBINDS_FILE" "$SCRIPT_DIR" <<'PY'
import os
import re
import sys

sys.path.insert(0, sys.argv[2])
from _utils import save_file

keybinds_file = sys.argv[1]
managed_pattern = re.compile(
    r'(?ms)^[ \t]*// >>> noctalia-calculator start >>>\n.*?^[ \t]*// <<< noctalia-calculator end <<<\n?'
)

if not os.path.exists(keybinds_file):
    raise SystemExit(0)

with open(keybinds_file, "r", encoding="utf-8") as handle:
    content = handle.read()

updated = managed_pattern.sub("", content, count=1)
# Normalize excessive blank lines only around the removed block area
updated = re.sub(r"\n{3,}", "\n\n", updated)

if updated != content:
    save_file(keybinds_file, updated)
    print('Removed managed Niri keybind: Mod+Shift+C')
PY

if [ -L "$TARGET_DIR" ] && [ "$(readlink -f "$TARGET_DIR")" = "$SCRIPT_DIR" ]; then
  rm -f "$TARGET_DIR"
fi

printf 'Removed %s from Noctalia configuration\n' "$PLUGIN_ID"
