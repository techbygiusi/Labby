#!/bin/sh
set -eu

node /opt/labby/backend/server.js &
backend_pid=$!

nginx -g 'daemon off;' &
nginx_pid=$!

shutdown() {
  trap - INT TERM EXIT
  kill -TERM "$backend_pid" "$nginx_pid" 2>/dev/null || true
  wait "$backend_pid" 2>/dev/null || true
  wait "$nginx_pid" 2>/dev/null || true
}

trap shutdown INT TERM EXIT

while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$nginx_pid" 2>/dev/null; do
  sleep 1
done

exit 1
