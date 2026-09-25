import 'server-only';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

declare global {
  // eslint-disable-next-line no-var
  var __dbPool__: Pool | undefined;
  // eslint-disable-next-line no-var
  var __drizzleDb__: NodePgDatabase<typeof schema> | undefined;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

function createDatabaseConnection(): { pool: Pool | null; db: NodePgDatabase<typeof schema> } {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    // When DATABASE_URL is not set (e.g. during build or client test simulation),
    // provide an empty pool and a dummy proxy that throws on query attempt.
    const dummyPool = null as unknown as Pool;
    const dummyDb = new Proxy({} as NodePgDatabase<typeof schema>, {
      get(_target, prop) {
        if (prop === 'query' || prop === 'select' || prop === 'insert' || prop === 'update' || prop === 'delete' || prop === 'transaction') {
          return () => {
            throw new Error('DATABASE_URL environment variable is not configured. Database operations are unavailable.');
          };
        }
        return undefined;
      },
    });
    return { pool: dummyPool, db: dummyDb };
  }

  // Reuse existing pool in development to avoid exhausting connections on hot reloads
  if (!globalThis.__dbPool__) {
    const isRemote =
      databaseUrl.includes('supabase') ||
      databaseUrl.includes('pooler') ||
      databaseUrl.includes('aws') ||
      databaseUrl.includes('sslmode=') ||
      !databaseUrl.includes('localhost');
    const ssl = isRemote ? { rejectUnauthorized: false } : undefined;

    globalThis.__dbPool__ = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ...(ssl ? { ssl } : {}),
    });
  }

  if (!globalThis.__drizzleDb__) {
    globalThis.__drizzleDb__ = drizzle(globalThis.__dbPool__, { schema });
  }

  return {
    pool: globalThis.__dbPool__,
    db: globalThis.__drizzleDb__,
  };
}

const { pool, db } = createDatabaseConnection();

export { pool, db };
export * from './schema';
