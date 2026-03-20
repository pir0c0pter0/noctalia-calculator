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

python3 - "$PLUGINS_FILE" "$SETTINGS_FILE" "$PLUGIN_ID" <<'PY'
import json
import os
import sys

plugins_file, settings_file, plugin_id = sys.argv[1:4]
widget_id = f"plugin:{plugin_id}"


def load_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, "r", encoding="utf-8") as handle:
        content = handle.read().strip()
    if not content:
        return default
    return json.loads(content)


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=True)
        handle.write("\n")


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

python3 - "$NIRI_KEYBINDS_FILE" <<'PY'
import os
import re
import sys

keybinds_file = sys.argv[1]
managed_pattern = re.compile(
    r'(?ms)^[ \t]*// >>> noctalia-calculator start >>>\n.*?^[ \t]*// <<< noctalia-calculator end <<<\n?'
)

if not os.path.exists(keybinds_file):
    raise SystemExit(0)

with open(keybinds_file, "r", encoding="utf-8") as handle:
    content = handle.read()

updated = managed_pattern.sub("", content, count=1)
updated = re.sub(r"\n{3,}", "\n\n", updated)

if updated != content:
    with open(keybinds_file, "w", encoding="utf-8") as handle:
        handle.write(updated)
    print('Removed managed Niri keybind: Mod+Shift+C')
PY

if [ -L "$TARGET_DIR" ] && [ "$(readlink -f "$TARGET_DIR")" = "$SCRIPT_DIR" ]; then
  rm -f "$TARGET_DIR"
fi

printf 'Removed %s from Noctalia configuration\n' "$PLUGIN_ID"
