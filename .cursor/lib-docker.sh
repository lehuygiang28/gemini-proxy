#!/usr/bin/env bash
# Shared helpers for running Docker (and therefore local Supabase) inside a
# Cursor Cloud Agent VM. Docker runs "nested" here, so it needs the
# fuse-overlayfs storage driver and legacy iptables to get working overlay
# mounts and container-to-container networking.
#
# Every function is idempotent and safe to call on each boot.

set -euo pipefail

DOCKER_DAEMON_LOG="/tmp/dockerd.log"
DOCKER_DESIRED_DRIVER="fuse-overlayfs"

# Install docker + fuse-overlayfs and configure the daemon for nested use.
# No-op when everything is already present, so it is cheap to re-run.
ensure_docker_installed() {
    if ! command -v dockerd >/dev/null 2>&1 \
        || ! command -v fuse-overlayfs >/dev/null 2>&1 \
        || ! command -v setfacl >/dev/null 2>&1; then
        export DEBIAN_FRONTEND=noninteractive
        sudo apt-get update -y
        # --force-confold/confdef keep existing conffiles (e.g. /etc/fuse.conf)
        # without an interactive prompt that would otherwise abort dpkg.
        sudo apt-get install -y \
            -o Dpkg::Options::=--force-confold \
            -o Dpkg::Options::=--force-confdef \
            docker.io fuse-overlayfs acl
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

# Grant the current user access to the docker socket with a least-privilege ACL
# instead of making it world-writable. Falls back to docker-group ownership.
grant_docker_socket_access() {
    local sock="/var/run/docker.sock"
    [ -S "$sock" ] || return 0
    if command -v setfacl >/dev/null 2>&1 \
        && sudo setfacl -m "u:$(id -un):rw" "$sock" 2>/dev/null; then
        return 0
    fi
    sudo groupadd -f docker 2>/dev/null || true
    sudo usermod -aG docker "$(id -un)" 2>/dev/null || true
    sudo chgrp docker "$sock" 2>/dev/null || true
    sudo chmod 660 "$sock" 2>/dev/null || true
}

# True when the running daemon already uses the desired storage driver.
docker_driver_ok() {
    [ "$(sudo docker info --format '{{.Driver}}' 2>/dev/null || true)" = "$DOCKER_DESIRED_DRIVER" ]
}

# Stop a running docker daemon using its pidfile / service (never pkill by name).
# Waits for the process to actually exit (not just stop responding) so a
# subsequent start does not collide with a still-shutting-down daemon.
stop_docker_daemon() {
    local pid=""
    [ -f /var/run/docker.pid ] && pid="$(cat /var/run/docker.pid 2>/dev/null || true)"
    sudo systemctl stop docker.socket docker 2>/dev/null || true
    [ -n "$pid" ] && sudo kill "$pid" 2>/dev/null || true

    local i
    for i in $(seq 1 60); do
        if [ -n "$pid" ] && sudo kill -0 "$pid" 2>/dev/null; then
            sleep 1
        elif sudo docker info >/dev/null 2>&1; then
            sleep 1
        else
            break
        fi
    done

    # Remove a stale pidfile left by the now-exited daemon.
    if [ ! -n "$pid" ] || ! sudo kill -0 "$pid" 2>/dev/null; then
        sudo rm -f /var/run/docker.pid 2>/dev/null || true
    fi
}

# Launch dockerd in the background and wait until it accepts connections.
start_docker_daemon() {
    # Clear a stale pidfile from a daemon that has already exited; dockerd
    # refuses to start while a pidfile it considers live is present.
    if [ -f /var/run/docker.pid ] && ! sudo docker info >/dev/null 2>&1; then
        sudo rm -f /var/run/docker.pid 2>/dev/null || true
    fi

    # Pre-create a root-owned, writable log so the redirect never fails on a
    # stale file left by a previous run.
    sudo rm -f "$DOCKER_DAEMON_LOG" 2>/dev/null || true
    sudo install -m 666 /dev/null "$DOCKER_DAEMON_LOG" 2>/dev/null || true
    sudo bash -c "nohup dockerd >>'$DOCKER_DAEMON_LOG' 2>&1 &"

    local i
    for i in $(seq 1 60); do
        if sudo docker info >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done

    echo "ERROR: docker daemon did not become ready; see $DOCKER_DAEMON_LOG" >&2
    sudo tail -n 30 "$DOCKER_DAEMON_LOG" >&2 || true
    return 1
}

# Ensure a docker daemon is running with the desired (fuse-overlayfs) driver.
# Restarts a daemon that is up but using the wrong driver, so a pre-existing
# default-driver daemon on the base image does not silently break Supabase.
ensure_docker_running() {
    if sudo docker info >/dev/null 2>&1; then
        if docker_driver_ok; then
            grant_docker_socket_access
            return 0
        fi
        echo "==> Docker is running with the wrong storage driver; restarting for $DOCKER_DESIRED_DRIVER" >&2
        stop_docker_daemon
    fi

    start_docker_daemon
    grant_docker_socket_access
}
