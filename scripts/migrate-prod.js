const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

// 1. Load .env.prod
const envProdPath = path.join(__dirname, '..', '.env.prod');
if (!fs.existsSync(envProdPath)) {
  console.error('.env.prod file not found at:', envProdPath);
  process.exit(1);
}

const envConfig = dotenv.parse(fs.readFileSync(envProdPath, 'utf8'));
const databaseUrl = envConfig.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL not found in .env.prod');
  process.exit(1);
}

console.log('Connecting to production database...');

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const migrationFiles = [
  '001_profiles.sql',
  '002_projects.sql',
  '003_project_members.sql',
  '004_project_assets.sql',
  '005_project_operations.sql',
  '006_project_snapshots.sql',
  '007_project_invites.sql',
  '008_storage_buckets.sql',
  '009_profiles_email_and_invites.sql',
];

async function run() {
  await client.connect();
  console.log('Successfully connected to production PostgreSQL.\n');

  // Ensure drizzle schema and __drizzle_migrations table exist
  await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle;`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    );
  `);

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

  for (const filename of migrationFiles) {
    const filePath = path.join(migrationsDir, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`Migration file missing: ${filename}`);
      continue;
    }

    console.log(`Applying migration: ${filename}...`);
    let sql = fs.readFileSync(filePath, 'utf8');

    // Make CREATE POLICY idempotent by adding DROP POLICY IF EXISTS before CREATE POLICY
    // Regex matches: CREATE POLICY "name" ON table ...
    sql = sql.replace(/CREATE POLICY\s+"([^"]+)"\s+ON\s+([^\s]+)/gi, (match, policyName, tableName) => {
      return `DROP POLICY IF EXISTS "${policyName}" ON ${tableName};\n${match}`;
    });

    try {
      await client.query(sql);
      console.log(`[✓] Successfully applied: ${filename}`);
    } catch (err) {
      console.error(`[X] Error applying ${filename}:`, err.message);
      throw err;
    }
  }

  // Ensure Drizzle migration journal entries are recorded in drizzle.__drizzle_migrations
  const journalPath = path.join(__dirname, '..', 'drizzle', 'meta', '_journal.json');
  if (fs.existsSync(journalPath)) {
    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
    for (const entry of journal.entries) {
      const existing = await client.query(
        'SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = $1',
        [entry.when.toString()]
      );
      if (existing.rows.length === 0) {
        await client.query(
          'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
          [entry.tag, entry.when]
        );
        console.log(`[✓] Recorded Drizzle migration journal: ${entry.tag}`);
      }
    }
  }

  console.log('\n--- Production Migration Verification ---');

  // Verify public tables
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('Public tables:', tablesRes.rows.map((r) => r.table_name).join(', '));

  // Verify profiles columns
  const profilesCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    ORDER BY ordinal_position;
  `);
  console.log('Profiles columns:', profilesCols.rows.map((r) => `${r.column_name} (${r.data_type})`).join(', '));

  // Verify RLS policies
  const policiesRes = await client.query(`
    SELECT tablename, policyname, cmd 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    ORDER BY tablename, policyname;
  `);
  console.log(`Active RLS policies in public (${policiesRes.rows.length}):`);
  for (const pol of policiesRes.rows) {
    console.log(`  - [${pol.tablename}] (${pol.cmd}) ${pol.policyname}`);
  }

  // Verify functions
  const funcsRes = await client.query(`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    ORDER BY routine_name;
  `);
  console.log('Public security functions:', funcsRes.rows.map((r) => r.routine_name).join(', '));

  // Verify triggers
  const triggersRes = await client.query(`
    SELECT trigger_name, event_object_table 
    FROM information_schema.triggers 
    ORDER BY trigger_name;
  `);
  console.log('Triggers:', triggersRes.rows.map((r) => `${r.trigger_name} on ${r.event_object_table}`).join(', '));

  // Verify storage buckets
  const bucketsRes = await client.query(`
    SELECT id, name, public 
    FROM storage.buckets 
    ORDER BY id;
  `);
  console.log('Storage buckets:', bucketsRes.rows.map((r) => `${r.id} (public=${r.public})`).join(', '));

  await client.end();
  console.log('\nAll production migrations applied and verified successfully!');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
