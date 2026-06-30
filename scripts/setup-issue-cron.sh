#!/usr/bin/env bash
# Installs a system cron job that runs the issue-watcher every 30 minutes.
# Cron minimum interval enforced by the platform is 5 minutes; 30 min is well above it
# and avoids hitting GitHub rate limits (5000 req/hour for authenticated users).
set -euo pipefail

WATCHER="/home/z/my-project/scripts/issue-watcher.py"
LOG="/home/z/my-project/scripts/issue-watcher-cron.log"
CRON_LINE="*/30 * * * * /usr/bin/python3 ${WATCHER} >> ${LOG} 2>&1"

# Ensure python3 + watcher exist
command -v python3 >/dev/null || { echo "python3 not found"; exit 1; }
[ -f "$WATCHER" ] || { echo "watcher not found at $WATCHER"; exit 1; }

# Add cron job idempotently (remove existing ischool-watcher line, then re-add)
( crontab -l 2>/dev/null | grep -v 'issue-watcher.py' ; echo "$CRON_LINE" ) | crontab -

echo "Cron job installed:"
crontab -l | grep issue-watcher || echo "(none)"
echo "Watcher output will be logged to: $LOG"
