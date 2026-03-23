# Publishing to the Noctalia Plugin Registry

To make this plugin available in the official Noctalia plugin list for all users:

## 1. Fork the official registry

```bash
gh repo fork noctalia-dev/noctalia-plugins --clone=false
```

## 2. Clone your fork

```bash
gh repo clone pir0c0pter0/noctalia-plugins /tmp/noctalia-plugins-fork
```

## 3. Sync fork with upstream

```bash
cd /tmp/noctalia-plugins-fork
gh repo sync pir0c0pter0/noctalia-plugins --branch main
git pull origin main
```

If `gh repo sync` fails, use:

```bash
git remote add upstream https://github.com/noctalia-dev/noctalia-plugins.git 2>/dev/null
git fetch upstream
git reset --hard upstream/main
git push origin main --force
```

## 4. Create a branch

```bash
git checkout -b add-noctalia-calculator
```

## 5. Copy plugin files into a new directory

```bash
mkdir -p /tmp/noctalia-plugins-fork/noctalia-calculator

# Copy all plugin files (QML, manifest, i18n, LICENSE, README)
cp manifest.json Main.qml BarWidget.qml Panel.qml Settings.qml \
   README.md LICENSE \
   /tmp/noctalia-plugins-fork/noctalia-calculator/

cp -r i18n /tmp/noctalia-plugins-fork/noctalia-calculator/
```

> **Note:** Install/remove/update scripts and `_utils.py` are for standalone installation only and should NOT be included in the registry submission.

## 6. Update manifest.json repository field

In the **copy** inside `noctalia-plugins-fork/noctalia-calculator/manifest.json`, change the `repository` field to point to the official registry:

```json
"repository": "https://github.com/noctalia-dev/noctalia-plugins"
```

## 7. Commit and push

```bash
cd /tmp/noctalia-plugins-fork
git add noctalia-calculator/
git commit -m "feat: add noctalia-calculator plugin"
git push -u origin add-noctalia-calculator
```

## 8. Create the pull request

```bash
gh pr create --repo noctalia-dev/noctalia-plugins \
  --head pir0c0pter0:add-noctalia-calculator \
  --base main \
  --title "Add noctalia-calculator plugin" \
  --body "Theme-aware calculator plugin with bar widget, floating panel, keyboard support, and bilingual UI (EN/PT)."
```

## 9. Wait for merge

- The `assign-reviewers` GitHub Action runs automatically on PR creation
- Once merged, `registry.json` is updated automatically by GitHub Actions
- The plugin then appears in **Noctalia Settings > Plugins** for all users

## Plugin directory structure (required by noctalia-plugins)

```
noctalia-calculator/
├── manifest.json      # Plugin metadata (required)
├── Main.qml           # Calculator engine and state
├── BarWidget.qml      # Bar capsule with live badge
├── Panel.qml          # Floating calculator panel
├── Settings.qml       # Settings UI
├── i18n/              # Translations
│   ├── en.json
│   └── pt.json
├── LICENSE
└── README.md
```

> **Note:** The `registry.json` does not need to be edited manually — it is maintained automatically by GitHub Actions when `manifest.json` files are added or modified.

## Quick reference

| Field | Value |
|-------|-------|
| Plugin ID | `noctalia-calculator` |
| Official repo | `noctalia-dev/noctalia-plugins` |
| Standalone repo | `pir0c0pter0/noctalia-calculator` |
| Reference PR | Auto Tile PR #282 (merged 2026-02-19) |
