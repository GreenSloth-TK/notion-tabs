#!/bin/sh
# Installs Electron and registers the launcher. Re-run after `npm update electron`.
set -e
DIR=$(cd "$(dirname "$0")" && pwd)
cd "$DIR"
npm install
# npm sometimes skips Electron's binary download
[ -x node_modules/electron/dist/electron ] || node node_modules/electron/install.js

# Ubuntu 24.04+ blocks the user namespaces Electron's sandbox needs unless an
# AppArmor profile allows them (same approach as Ubuntu's own Chrome profile)
if [ "$(sysctl -n kernel.apparmor_restrict_unprivileged_userns 2>/dev/null)" = 1 ]; then
  echo "Registering AppArmor profile (needs sudo)..."
  sudo tee /etc/apparmor.d/notion-tabs > /dev/null <<EOF
abi <abi/4.0>,
include <tunables/global>

profile notion-tabs "$DIR/node_modules/electron/dist/electron" flags=(unconfined) {
  userns,

  include if exists <local/notion-tabs>
}
EOF
  sudo apparmor_parser -r /etc/apparmor.d/notion-tabs
fi

mkdir -p ~/.local/share/applications
sed "s#@DIR@#$DIR#g" notion.desktop > ~/.local/share/applications/notion-tabs.desktop
echo "Installed: ~/.local/share/applications/notion-tabs.desktop"
