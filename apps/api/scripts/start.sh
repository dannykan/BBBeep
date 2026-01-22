#!/bin/sh
# Start script for Railway deployment
# This script runs migrations and then starts the application

set -e

echo "Running database migrations..."
# Use local prisma binary to avoid permission issues with npx
./node_modules/.bin/prisma migrate deploy --skip-generate || {
  echo "Migration failed, but continuing..."
}

echo "Starting application..."
exec node dist/main
