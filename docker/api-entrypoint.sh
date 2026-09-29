#!/bin/sh
set -eu

export LANG=C.UTF-8
export POSTGRES_USER="${POSTGRES_USER:-mqlt}"
export POSTGRES_DB="${POSTGRES_DB:-mqlt}"
export POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
export PG_PORT="${PG_PORT:-5432}"
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3000}"
export API_PREFIX="${API_PREFIX:-/v1}"
export PUBLIC_API_PREFIX="${PUBLIC_API_PREFIX:-/api/v1}"
export HOST="${HOST:-0.0.0.0}"
export NODE_PATH="/app/node_modules${NODE_PATH:+:$NODE_PATH}"

if [ -n "${POSTGRES_PASSWORD:-}" ]; then
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${PG_PORT}/${POSTGRES_DB}?schema=public"
else
  export DATABASE_URL="postgresql://${POSTGRES_USER}@${POSTGRES_HOST}:${PG_PORT}/${POSTGRES_DB}?schema=public"
fi

if [ -f /app/prisma/schema.prisma ]; then
  echo "prisma generate..."
  cd /app
  npx prisma generate --schema=/app/prisma/schema.prisma
  if [ "${MQLT_RUN_MIGRATIONS:-0}" = "1" ]; then
    echo "running prisma migrate deploy..."
    npx prisma migrate deploy --schema=/app/prisma/schema.prisma
  fi
fi

# Optional SQL overlays (IF NOT EXISTS)
if [ "${MQLT_RUN_SQL_OVERLAY:-0}" = "1" ] && [ -d /app/sql ]; then
  echo "applying sql overlays..."
  for f in /app/sql/*.sql; do
    [ -f "$f" ] || continue
    case "$f" in
      *.dump.sql) continue ;;
    esac
    echo "  -> $f"
    PGPASSWORD="${POSTGRES_PASSWORD:-}" psql \
      -h "$POSTGRES_HOST" -p "$PG_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
      -v ON_ERROR_STOP=0 -f "$f" || true
  done
fi

echo "starting API on ${HOST}:${PORT} (db ${POSTGRES_HOST}:${PG_PORT})..."
if command -v su-exec >/dev/null 2>&1; then
  exec su-exec mqlt node dist/src/main.js
fi
exec node dist/src/main.js
