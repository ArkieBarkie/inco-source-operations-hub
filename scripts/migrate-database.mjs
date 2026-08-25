import {readFile} from 'node:fs/promises';
import postgres from 'postgres';

const connectionString = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('MIGRATION_DATABASE_URL of DATABASE_URL ontbreekt.');
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 1,
  ssl: process.env.DATABASE_SSL === 'disable' ? false : 'require',
  prepare: false,
});

try {
  const migration = await readFile(new URL('../migrations/001_portal_security.sql', import.meta.url), 'utf8');
  await sql.unsafe(migration);
  console.log('Database-migratie 001_portal_security.sql is uitgevoerd.');
} finally {
  await sql.end();
}
