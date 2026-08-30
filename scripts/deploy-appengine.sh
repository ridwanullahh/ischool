#!/usr/bin/env bash
# Bismillah — One-click ischool deploy to Google Cloud App Engine.
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT_ID="${GCLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null || true)}"
if [ -z "$PROJECT_ID" ]; then echo "✗ gcloud project not set. Run: gcloud config set project <ID>" >&2; exit 1; fi
[ -f .env.gcp ] || { echo "✗ Missing .env.gcp (secrets). Copy .env.example → .env.gcp and fill it in." >&2; exit 1; }
set -a; . ./.env.gcp; set +a
if [ "${1:-}" != "--no-build" ]; then
  echo "▶ Building ischool (Node target)…"
  npm run build
fi
echo "▶ Injecting secrets into app.yaml env_variables (in-memory only)…"
python3 - <<'PY'
import os, re
keys = [k for k in os.environ if k.startswith(('LIGHTBASE_','DB_PROVIDER','SESSION_SECRET','ENCRYPTION_KEY','PLATFORM_ADMINS','PUBLIC_BASE_URL','AI_','PAYMENTS_PROVIDER','BIRRPAY_','PAYSTACK_','STRIPE_','FLUTTERWAVE_','GMAIL_','EMAIL_FROM','CLOUDINARY_'))]
env = {k: os.environ[k] for k in keys if os.environ.get(k)}
with open('app.yaml') as f: y = f.read()
block = 'env_variables:\n'
for k, v in env.items(): block += f'  {k}: "{v}"\n'
y = re.sub(r'env_variables:\n(?:  .*\n)*', block, y, count=1)
with open('app.yaml', 'w') as f: f.write(y)
print(f'  ✓ {len(env)} env vars injected')
PY
echo "▶ Deploying…"
gcloud app deploy app.yaml --project "$PROJECT_ID" --quiet --promote
URL="https://${PROJECT_ID}.appspot.com"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$URL/" || echo "000")
echo "  landing → HTTP $CODE"
[ "$CODE" = "200" ] || [ "$CODE" = "302" ] && echo "✓ ischool is live: $URL" || echo "⚠ check logs: gcloud app logs tail"
