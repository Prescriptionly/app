#!/bin/bash
set -e

echo "🚀 Starting Prescriptionly Application Container..."

# 1. Wait for MySQL Database to become reachable
if [ -n "$DATABASE_URL" ]; then
  echo "🔍 Checking database connectivity and applying migrations..."
  
  # Run prisma migrate deploy (only applies new unapplied migrations, safe & idempotent)
  MAX_RETRIES=15
  COUNT=0
  until npx --workspace=@prescriptionly/api prisma migrate deploy; do
    COUNT=$((COUNT+1))
    if [ $COUNT -ge $MAX_RETRIES ]; then
      echo "❌ Database connection or migration failed after $MAX_RETRIES attempts. Exiting."
      exit 1
    fi
    echo "⏳ Waiting for database to be ready... attempt $COUNT of $MAX_RETRIES"
    sleep 3
  done

  echo "✅ Database schema is up to date."

  # Optional auto-seed: run seed script if AUTO_SEED=true
  if [ "$AUTO_SEED" = "true" ]; then
    echo "🌱 Running database seeds..."
    node apps/api/dist/prisma/seed.js || true
  fi
fi

# 2. Start API backend in the background
echo "🔌 Starting Node.js API server on port 4000..."
node apps/api/dist/src/server.js &
API_PID=$!

# Trap signals and ensure proper shutdown
trap "kill -TERM $API_PID; nginx -s quit; exit 0" SIGINT SIGTERM

# 3. Start Nginx in the foreground
echo "🌐 Starting Nginx Web & Proxy Server on port 80..."
nginx -g "daemon off;"
