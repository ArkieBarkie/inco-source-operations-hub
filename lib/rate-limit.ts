import 'server-only';

import {createHash} from 'node:crypto';
import {portalDataMode} from './auth-config';
import {getDatabase} from './database';

type WindowRule = {seconds: number; limit: number};
type MemoryBucket = {count: number; expiresAt: number};

declare global {
  var __incoRateLimitBuckets: Map<string, MemoryBucket> | undefined;
}

const memoryBuckets = globalThis.__incoRateLimitBuckets ?? new Map<string, MemoryBucket>();
globalThis.__incoRateLimitBuckets = memoryBuckets;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  headers: Record<string, string>;
};

export function requestClientAddress(request: Request) {
  const netlify = request.headers.get('x-nf-client-connection-ip')?.trim();
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const real = request.headers.get('x-real-ip')?.trim();
  return (netlify || forwarded || real || 'unknown').slice(0, 128);
}

function keyHash(scope: string, identity: string) {
  return createHash('sha256').update(`${scope}:${identity}`).digest('hex');
}

function windowStart(now: number, seconds: number) {
  const windowMs = seconds * 1_000;
  return new Date(Math.floor(now / windowMs) * windowMs);
}

async function databaseCount(scope: string, hash: string, rule: WindowRule, now: number) {
  const database = getDatabase();
  const startedAt = windowStart(now, rule.seconds);
  const rows = await database`
    insert into portal_rate_limit_buckets (scope, key_hash, window_started_at, window_seconds, request_count)
    values (${scope}, ${hash}, ${startedAt}, ${rule.seconds}, 1)
    on conflict (scope, key_hash, window_started_at, window_seconds)
    do update set request_count = portal_rate_limit_buckets.request_count + 1, updated_at = now()
    returning request_count
  `;
  return {count: Number(rows[0]?.request_count ?? rule.limit + 1), startedAt: startedAt.getTime()};
}

function memoryCount(scope: string, hash: string, rule: WindowRule, now: number) {
  const startedAt = windowStart(now, rule.seconds).getTime();
  const key = `${scope}:${hash}:${rule.seconds}:${startedAt}`;
  const current = memoryBuckets.get(key);
  const count = (current?.count ?? 0) + 1;
  memoryBuckets.set(key, {count, expiresAt: startedAt + rule.seconds * 1_000});
  if (memoryBuckets.size > 2_000) {
    for (const [bucketKey, bucket] of memoryBuckets) if (bucket.expiresAt < now) memoryBuckets.delete(bucketKey);
  }
  return {count, startedAt};
}

export async function takeRateLimit(scope: string, identity: string, rules: WindowRule[]): Promise<RateLimitResult> {
  const now = Date.now();
  const hash = keyHash(scope, identity);
  let counts: Array<{count: number; startedAt: number}>;
  try {
    counts = portalDataMode() === 'database'
      ? await Promise.all(rules.map((rule) => databaseCount(scope, hash, rule, now)))
      : rules.map((rule) => memoryCount(scope, hash, rule, now));
  } catch {
    return {allowed: false, remaining: 0, retryAfterSeconds: 60, headers: {'Retry-After': '60'}};
  }

  const blockedIndexes = counts.flatMap((item, index) => item.count > rules[index].limit ? [index] : []);
  const allowed = blockedIndexes.length === 0;
  const retryAfterSeconds = allowed ? 0 : Math.max(...blockedIndexes.map((index) => Math.max(1, Math.ceil((counts[index].startedAt + rules[index].seconds * 1_000 - now) / 1_000))));
  const remaining = Math.max(0, Math.min(...counts.map((item, index) => rules[index].limit - item.count)));
  return {
    allowed,
    remaining,
    retryAfterSeconds,
    headers: {
      'RateLimit-Limit': rules.map((rule) => `${rule.limit};w=${rule.seconds}`).join(', '),
      'RateLimit-Remaining': String(remaining),
      'RateLimit-Reset': String(retryAfterSeconds),
      ...(!allowed ? {'Retry-After': String(retryAfterSeconds)} : {}),
    },
  };
}
