import 'server-only';

import postgres, {type Sql} from 'postgres';
import {portalDataMode} from './auth-config';

declare global {
  var __incoDatabase: Sql | undefined;
}

export function getDatabase(): Sql {
  if (portalDataMode() !== 'database') throw new Error('Databaseopslag is niet actief.');
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error('DATABASE_URL ontbreekt terwijl PORTAL_DATA_MODE=database.');
  if (!globalThis.__incoDatabase) {
    globalThis.__incoDatabase = postgres(connectionString, {
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      ssl: process.env.DATABASE_SSL === 'disable' ? false : 'require',
    });
  }
  return globalThis.__incoDatabase;
}

export type DatabaseTransaction = postgres.TransactionSql;

export async function withTenantTransaction<T>(tenantId: string, callback: (transaction: DatabaseTransaction) => Promise<T>) {
  const database = getDatabase();
  return database.begin(async (transaction) => {
    await transaction`select set_config('app.tenant_id', ${tenantId}, true)`;
    return callback(transaction);
  }) as Promise<T>;
}

export async function databaseHealth() {
  const startedAt = Date.now();
  await getDatabase()`select 1 as ok`;
  return {ok: true, latencyMs: Date.now() - startedAt};
}
