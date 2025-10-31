#!/usr/bin/env bash
set -euo pipefail

# Build and upload the test harness to a dedicated GCS prefix
# BUCKET and PREFIX can be overridden via environment variables

BUCKET=${BUCKET:-public_statichosting}
PREFIX=${PREFIX:-measurement-engine-test-harness}

echo "[deploy] Building app..."
npm run build

if [[ ! -d dist ]]; then
  echo "[deploy] Error: dist/ not found after build" >&2
  exit 1
fi

if ! command -v gsutil >/dev/null 2>&1; then
  echo "[deploy] Error: gsutil not found" >&2
  exit 1
fi

DEST="gs://${BUCKET}/${PREFIX}"
echo "[deploy] Syncing dist/ -> ${DEST}"
gsutil -m rsync -r -d dist "${DEST}"

echo "[deploy] Setting cache headers"
if [[ -d dist/assets ]]; then
  gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" "${DEST}/assets/**" || true
fi
if [[ -f dist/index.html ]]; then
  gsutil -m setmeta -h "Cache-Control:no-cache" "${DEST}/index.html" || true
fi
if [[ -f dist/404.html ]]; then
  gsutil -m setmeta -h "Cache-Control:no-cache" "${DEST}/404.html" || true
fi

PUBLIC_URL="https://storage.googleapis.com/${BUCKET}/${PREFIX}/index.html"
echo "[deploy] Done: ${PUBLIC_URL}"
