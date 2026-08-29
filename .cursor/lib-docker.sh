#!/usr/bin/env bash
# Shared helpers for running Docker (and therefore local Supabase) inside a
# Cursor Cloud Agent VM. Docker runs "nested" here, so it needs the
# fuse-overlayfs storage driver and legacy iptables to get working overlay
# mounts and container-to-container networking.
#
# Every function is idempotent and safe to call on each boot.

set -euo pipefail

DOCKER_DAEMON_LOG="/tmp/dockerd.log"

# Install docker + fuse-overlayfs and configure the daemon for nested use.
# No-op when everything is already present, so it is cheap to re-run.
ensure_docker_installed() {
    if ! command -v dockerd >/dev/null 2>&1 || ! command -v fuse-overlayfs >/dev/null 2>&1; then
        export DEBIAN_FRONTEND=noninteractive
        sudo apt-get update -y
        sudo apt-get install -y docker.io fuse-overlayfs
    fi

    # The default overlayfs snapshotter cannot extract some image layers in this
    # nested environment; fuse-overlayfs can. Disable the containerd snapshotter
    # so the classic fuse-overlayfs storage driver is used.
    local daemon_json="/etc/docker/daemon.json"
    local desired='{
  "storage-driver": "fuse-overlayfs",
  "features": { "containerd-snapshotter": false }
}'
    if [ ! -f "$daemon_json" ] || [ "$(cat "$daemon_json")" != "$desired" ]; then
        echo "$desired" | sudo tee "$daemon_json" >/dev/null
    fi

    # nftables-based iptables breaks the docker bridge network here; use legacy.
    sudo update-alternatives --set iptables /usr/sbin/iptables-legacy >/dev/null 2>&1 || true
    sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy >/dev/null 2>&1 || true
}

# Start the docker daemon if it is not already accepting connections, then make
# the socket usable without sudo. Returns once docker responds or times out.
ensure_docker_running() {
    if sudo docker info >/dev/null 2>&1; then
        sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
        return 0
    fi

    # Pre-create a root-owned, writable log so the redirect never fails on a
    # stale file left by a previous run.
    sudo rm -f "$DOCKER_DAEMON_LOG" 2>/dev/null || true
    sudo install -m 666 /dev/null "$DOCKER_DAEMON_LOG" 2>/dev/null || true
    sudo bash -c "nohup dockerd >>'$DOCKER_DAEMON_LOG' 2>&1 &"

    local i
    for i in $(seq 1 60); do
        if sudo docker info >/dev/null 2>&1; then
            sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
            return 0
        fi
        sleep 1
    done

    echo "ERROR: docker daemon did not become ready; see $DOCKER_DAEMON_LOG" >&2
    sudo tail -n 30 "$DOCKER_DAEMON_LOG" >&2 || true
    return 1
}
