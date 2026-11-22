#!/bin/sh
set -e

echo "[cadence] Syncing database schema..."
npx prisma db push --skip-generate

echo "[cadence] Starting Cadence server + embedded scheduler worker on port ${PORT:-3000}..."
export HOSTNAME="0.0.0.0"
export PORT="${PORT:-3000}"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=384}"

if [ -f ".next/standalone/server.js" ]; then
  if [ -d ".next/static" ] && [ ! -d ".next/standalone/.next/static" ]; then
    cp -r .next/static .next/standalone/.next/static
  fi
  if [ -d "public" ] && [ ! -d ".next/standalone/public" ]; then
    cp -r public .next/standalone/public
  fi
  exec node .next/standalone/server.js
else
  exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
fi
