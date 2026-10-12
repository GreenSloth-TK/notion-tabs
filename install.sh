#!/bin/sh
# Installs Electron and registers the launcher. Re-run after `npm update electron`.
set -e
DIR=$(cd "$(dirname "$0")" && pwd)
cd "$DIR"
npm install
# npm sometimes skips Electron's binary download
[ -x node_modules/electron/dist/electron ] || node node_modules/electron/install.js
mkdir -p ~/.local/share/applications
sed "s#@DIR@#$DIR#g" notion.desktop > ~/.local/share/applications/notion-tabs.desktop
echo "Installed: ~/.local/share/applications/notion-tabs.desktop"
