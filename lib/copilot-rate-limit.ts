import 'server-only';

import type {PortalSession} from './auth-token';
import {requestClientAddress, takeRateLimit} from './rate-limit';

function positiveInteger(value: string | undefined, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

export const COPILOT_RATE_LIMITS = {
  perTenMinutes: positiveInteger(process.env.COPILOT_REQUESTS_PER_10_MINUTES, 20, 200),
  per24Hours: positiveInteger(process.env.COPILOT_REQUESTS_PER_24_HOURS, 100, 2_000),
  maxRequestCharacters: positiveInteger(process.env.COPILOT_MAX_REQUEST_CHARACTERS, 250_000, 1_000_000),
};

export function takeCopilotQuota(request: Request, session: PortalSession) {
  const identity = `${session.tenantId}:${session.userId}:${requestClientAddress(request)}`;
  return takeRateLimit('copilot', identity, [
    {seconds: 10 * 60, limit: COPILOT_RATE_LIMITS.perTenMinutes},
    {seconds: 24 * 60 * 60, limit: COPILOT_RATE_LIMITS.per24Hours},
  ]);
}
