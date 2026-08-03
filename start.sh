#!/bin/sh
set -e

echo "Running migrations..."
npx prisma migrate deploy

echo "Running seed..."
npx tsx prisma/seed.ts || echo "Seed skipped (already seeded)"

echo "Starting server..."
exec node dist/server.js
