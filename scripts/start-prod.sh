#!/bin/sh
set -e

echo "[cadence] Syncing database schema..."
npx prisma db push --skip-generate

echo "[cadence] Starting background publishing worker..."
npx tsx src/worker/index.ts &
WORKER_PID=$!

trap 'echo "[cadence] Stopping worker..."; kill $WORKER_PID 2>/dev/null || true' EXIT INT TERM

echo "[cadence] Starting Next.js production server on port ${PORT:-3000}..."
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
