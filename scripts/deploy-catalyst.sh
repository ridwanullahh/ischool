#!/usr/bin/env bash
# Non-interactive Catalyst deploy (Slate frontend; engine uses AppSail).
#
# Reads (in order): environment, then .catalyst.env (git-ignored), i.e.
#   CATALYST_TOKEN     long-lived CLI token from `catalyst token:generate`
#   CATALYST_PROJECT   project id or name (shared project hosting all apps)
#   CATALYST_ORG       org id (optional but recommended)
#   CATALYST_DC        data center suffix: com|eu|in|au|ca (informational)
#
# Usage: bash scripts/deploy-catalyst.sh [extra catalyst args...]
#   e.g. bash scripts/deploy-catalyst.sh --production
#
# Bismillah: written under the Core Working Protocol (see repo root).

set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .catalyst.env ]; then
  # shellcheck disable=SC1091
  set -a; . ./.catalyst.env; set +a
fi

: "${CATALYST_TOKEN:?CATALYST_TOKEN missing — run: catalyst token:generate}"
: "${CATALYST_PROJECT:?CATALYST_PROJECT missing — see docs/CATALYST_SLATE_HOSTING_PLAN.md §4.4}"

if ! command -v catalyst >/dev/null 2>&1; then
  echo "[deploy-catalyst] Catalyst CLI not found. Install: npm install -g zcatalyst-cli" >&2
  exit 1
fi

EXTRA_ARGS=("$@")
AUTH_ARGS=(--project "$CATALYST_PROJECT" --token "$CATALYST_TOKEN")
if [ -n "${CATALYST_ORG:-}" ]; then AUTH_ARGS+=(--org "$CATALYST_ORG"); fi

echo "[deploy-catalyst] deploying Slate apps to project ${CATALYST_PROJECT} (dc=${CATALYST_DC:-default})..."
# shellcheck disable=SC2086
catalyst deploy slate -m "deploy: $(git rev-parse --short HEAD 2>/dev/null || echo local) ${BUILD_LABEL:-}" \
  "${AUTH_ARGS[@]}" "${EXTRA_ARGS[@]}"

echo "[deploy-catalyst] done. Verify in console: Slate → app → Deployments → build log green + access URL 200 (root AND a deep route)."
