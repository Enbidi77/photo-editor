#!/bin/sh
set -e

# If AUTO_MIGRATE is true and DATABASE_URL is set, wait for DB and run migrations
if [ "$AUTO_MIGRATE" = "true" ] && [ -n "$DATABASE_URL" ]; then
  echo "==> [Docker Init] Checking database connection..."
  
  node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
    let attempts = 30;
    const checkDb = async () => {
      try {
        await pool.query('SELECT 1');
        console.log('==> [Docker Init] Database is ready and reachable.');
        await pool.end();
        process.exit(0);
      } catch (err) {
        attempts--;
        if (attempts <= 0) {
          console.warn('==> [Docker Init] Database connection timed out. Skipping automatic migration.');
          process.exit(0);
        }
        setTimeout(checkDb, 1000);
      }
    };
    checkDb();
  "

  echo "==> [Docker Init] Running database migrations..."
  pnpm db:migrate || {
    echo "==> [Docker Init] Notice: Migration encountered an issue or is already up-to-date."
  }
fi

echo "==> [Docker Init] Executing command: $@"
exec "$@"
