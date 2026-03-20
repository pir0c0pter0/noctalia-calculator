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

mkdir -p "$PLUGINS_DIR"

if [ -e "$TARGET_DIR" ] && [ ! -L "$TARGET_DIR" ] && [ "$(cd "$TARGET_DIR" && pwd)" != "$SCRIPT_DIR" ]; then
  printf 'Refusing to overwrite existing directory: %s\n' "$TARGET_DIR" >&2
  exit 1
fi

if [ "$SCRIPT_DIR" != "$TARGET_DIR" ]; then
  ln -sfn "$SCRIPT_DIR" "$TARGET_DIR"
fi

python3 - "$PLUGINS_FILE" "$SETTINGS_FILE" "$PLUGIN_ID" <<'PY'
import json
import os
import sys

plugins_file, settings_file, plugin_id = sys.argv[1:4]


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
        "enabled": True,
        "language": "auto",
        "maxHistory": 6,
        "precision": 8,
        "showBarValue": True
    }
}

if not any(item.get("id") == widget_entry["id"] for item in right if isinstance(item, dict)):
    right.append(widget_entry)

save_json(settings_file, settings)
PY

printf 'Installed %s\n' "$PLUGIN_ID"
printf 'Plugin path: %s\n' "$TARGET_DIR"
