"""Shared utilities for install / remove scripts."""

import json
import os
import shutil
import tempfile


def load_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, "r", encoding="utf-8") as handle:
        content = handle.read().strip()
    if not content:
        return default
    return json.loads(content)


def backup_file(path):
    """Create a .bak copy if the file exists."""
    if os.path.exists(path):
        shutil.copy2(path, path + ".bak")


def save_json(path, data):
    """Atomic write: write to temp file then rename."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    backup_file(path)
    fd, tmp_path = tempfile.mkstemp(
        dir=os.path.dirname(path),
        prefix=".tmp_",
        suffix=".json",
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2, ensure_ascii=False)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.rename(tmp_path, path)
    except BaseException:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise


def save_file(path, content):
    """Atomic write for arbitrary text files."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    backup_file(path)
    fd, tmp_path = tempfile.mkstemp(
        dir=os.path.dirname(path),
        prefix=".tmp_",
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.rename(tmp_path, path)
    except BaseException:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise
