#!/usr/bin/env bash
# Builds the VSD UI into the server's static folder and starts the server on :8095.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/logs"
if curl -s --max-time 3 http://localhost:8095/actuator/health >/dev/null; then
  echo "Auralis VSD already running: http://localhost:8095"; exit 0
fi
(cd "$ROOT/ui" && { [ -d node_modules ] || npm install --no-audit --no-fund; } && npm run build >/dev/null)
(cd "$ROOT/server" && nohup ./mvnw -q -B spring-boot:run </dev/null >"$ROOT/logs/vsd.log" 2>&1 &)
for _ in $(seq 1 90); do
  if curl -s --max-time 2 http://localhost:8095/actuator/health >/dev/null; then
    echo "Auralis VSD: http://localhost:8095"; exit 0
  fi
  sleep 2
done
echo "VSD did not start in time; see $ROOT/logs/vsd.log" >&2; exit 1
