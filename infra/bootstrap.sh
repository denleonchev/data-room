#!/bin/bash
# First-boot setup (EC2 user data). Everything that changes per deploy lives
# in deploy.sh instead, shipped fresh on every run.
set -euo pipefail

dnf install -y docker dnf-automatic

mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'JSON'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
JSON
systemctl enable --now docker
docker network create data-room

# Security updates apply nightly on their own.
sed -i 's/^upgrade_type = .*/upgrade_type = security/; s/^apply_updates = .*/apply_updates = yes/' \
  /etc/dnf/automatic.conf
systemctl enable --now dnf-automatic.timer

# Headroom for the migration run next to the API and Caddy.
fallocate -l 1G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap defaults 0 0' >> /etc/fstab
