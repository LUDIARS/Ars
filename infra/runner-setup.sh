#!/usr/bin/env bash
# EC2 Self-hosted Runner Setup Script (Ubuntu 24.04 ARM64 / c7g.xlarge)
#
# Usage:
#   GITHUB_OWNER=your-org GITHUB_REPO=your-repo RUNNER_TOKEN=xxx ./runner-setup.sh
#
# Prerequisites:
#   - Ubuntu 24.04 ARM64 AMI
#   - IAM role with ec2:StopInstances (for self-shutdown)
set -euo pipefail

RUNNER_USER="runner"
RUNNER_HOME="/home/${RUNNER_USER}"
RUNNER_DIR="${RUNNER_HOME}/actions-runner"
RUNNER_VERSION="2.322.0"

echo "=== Installing system dependencies ==="
apt-get update
apt-get install -y --no-install-recommends \
  curl jq git unzip \
  build-essential pkg-config libssl-dev \
  libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev \
  patchelf libgtk-3-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev \
  ca-certificates docker.io

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Rust (for runner user)
echo "=== Creating runner user ==="
id -u ${RUNNER_USER} &>/dev/null || useradd -m -s /bin/bash ${RUNNER_USER}
usermod -aG docker ${RUNNER_USER}

su - ${RUNNER_USER} -c 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y'

echo "=== Installing GitHub Actions Runner ==="
mkdir -p ${RUNNER_DIR}
cd ${RUNNER_DIR}
curl -sL "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-arm64-${RUNNER_VERSION}.tar.gz" \
  | tar xz
chown -R ${RUNNER_USER}:${RUNNER_USER} ${RUNNER_DIR}

# Configure runner
su - ${RUNNER_USER} -c "
  cd ${RUNNER_DIR} && \
  ./config.sh \
    --url 'https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}' \
    --token '${RUNNER_TOKEN}' \
    --name 'ars-builder-arm64' \
    --labels 'self-hosted,linux,arm64,ars-builder' \
    --unattended \
    --replace
"

# Install as systemd service
cd ${RUNNER_DIR}
./svc.sh install ${RUNNER_USER}
./svc.sh start

echo "=== Installing idle monitor ==="
cp /opt/ars-infra/idle-monitor.sh /usr/local/bin/idle-monitor.sh
chmod +x /usr/local/bin/idle-monitor.sh

cat > /etc/systemd/system/idle-monitor.service <<'UNIT'
[Unit]
Description=GitHub Actions Runner Idle Monitor
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/idle-monitor.sh
Restart=always
RestartSec=30
Environment=IDLE_TIMEOUT_MINUTES=5

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now idle-monitor.service

echo "=== Setup complete ==="
