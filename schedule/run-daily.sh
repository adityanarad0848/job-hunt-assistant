#!/usr/bin/env bash
# Daily runner for the Job Hunt Assistant (macOS / Linux).
# Runs the pipeline, logs output, and (if configured) sends a notification.
#
# It cd's into the project so cron's bare environment finds everything.
set -euo pipefail

# Resolve the project root (parent of this script's dir), following symlinks.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

LOG_DIR="$PROJECT_DIR/schedule/logs"
mkdir -p "$LOG_DIR"
STAMP="$(date +%Y-%m-%d_%H-%M-%S)"
LOG="$LOG_DIR/run-$STAMP.log"

# Load .env if present (so cron has the API keys).
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a; . "$PROJECT_DIR/.env"; set +a
fi

# Use 'node' from PATH; cron often has a minimal PATH, so allow an override.
NODE_BIN="${NODE_BIN:-node}"

echo "=== Job Hunt Assistant run $STAMP ===" | tee "$LOG"
"$NODE_BIN" run.js "$@" 2>&1 | tee -a "$LOG"

# Optional notifier: runs only if ENABLE_NOTIFY=1 (see schedule/notify.js).
if [ "${ENABLE_NOTIFY:-0}" = "1" ]; then
  "$NODE_BIN" schedule/notify.js 2>&1 | tee -a "$LOG" || true
fi

# Keep only the last 30 logs.
ls -1t "$LOG_DIR"/run-*.log 2>/dev/null | tail -n +31 | xargs -r rm -f

echo "Done. Log: $LOG"
