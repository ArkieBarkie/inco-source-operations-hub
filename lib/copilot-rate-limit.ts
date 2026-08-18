import 'server-only';

type Bucket = {
  shortStartedAt: number;
  shortCount: number;
  dayStartedAt: number;
  dayCount: number;
  lastSeenAt: number;
};

type QuotaResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  headers: Record<string, string>;
};

declare global {
  // Bewaart de teller tijdens lokale ontwikkeling en op een draaiende server.
  // Voor meerdere productie-instances vervangen door een gedeelde Redis-teller.
  var __incoCopilotBuckets: Map<string, Bucket> | undefined;
}

const TEN_MINUTES_MS = 10 * 60 * 1_000;
const DAY_MS = 24 * 60 * 60 * 1_000;

function positiveInteger(value: string | undefined, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

export const COPILOT_RATE_LIMITS = {
  perTenMinutes: positiveInteger(process.env.COPILOT_REQUESTS_PER_10_MINUTES, 20, 200),
  per24Hours: positiveInteger(process.env.COPILOT_REQUESTS_PER_24_HOURS, 100, 2_000),
  maxRequestCharacters: positiveInteger(process.env.COPILOT_MAX_REQUEST_CHARACTERS, 250_000, 1_000_000),
};

const buckets = globalThis.__incoCopilotBuckets ?? new Map<string, Bucket>();
globalThis.__incoCopilotBuckets = buckets;

function clientKey(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return (forwarded || realIp || 'local-client').slice(0, 128);
}

function cleanup(now: number) {
  if (buckets.size < 1_000) return;
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastSeenAt > DAY_MS) buckets.delete(key);
  }
}

export function takeCopilotQuota(request: Request): QuotaResult {
  const now = Date.now();
  cleanup(now);
  const key = clientKey(request);
  const bucket = buckets.get(key) ?? {
    shortStartedAt: now,
    shortCount: 0,
    dayStartedAt: now,
    dayCount: 0,
    lastSeenAt: now,
  };

  if (now - bucket.shortStartedAt >= TEN_MINUTES_MS) {
    bucket.shortStartedAt = now;
    bucket.shortCount = 0;
  }
  if (now - bucket.dayStartedAt >= DAY_MS) {
    bucket.dayStartedAt = now;
    bucket.dayCount = 0;
  }

  const shortBlocked = bucket.shortCount >= COPILOT_RATE_LIMITS.perTenMinutes;
  const dayBlocked = bucket.dayCount >= COPILOT_RATE_LIMITS.per24Hours;
  const retryAt = dayBlocked ? bucket.dayStartedAt + DAY_MS : bucket.shortStartedAt + TEN_MINUTES_MS;
  const retryAfterSeconds = Math.max(1, Math.ceil((retryAt - now) / 1_000));

  if (!shortBlocked && !dayBlocked) {
    bucket.shortCount += 1;
    bucket.dayCount += 1;
  }
  bucket.lastSeenAt = now;
  buckets.set(key, bucket);

  const remaining = Math.max(0, Math.min(
    COPILOT_RATE_LIMITS.perTenMinutes - bucket.shortCount,
    COPILOT_RATE_LIMITS.per24Hours - bucket.dayCount,
  ));

  return {
    allowed: !shortBlocked && !dayBlocked,
    remaining,
    retryAfterSeconds,
    headers: {
      'RateLimit-Limit': `${COPILOT_RATE_LIMITS.perTenMinutes};w=600, ${COPILOT_RATE_LIMITS.per24Hours};w=86400`,
      'RateLimit-Remaining': String(remaining),
      'RateLimit-Reset': String(retryAfterSeconds),
      ...((shortBlocked || dayBlocked) ? {'Retry-After': String(retryAfterSeconds)} : {}),
    },
  };
}
