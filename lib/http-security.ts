import 'server-only';

import {NextResponse} from 'next/server';

export const NO_STORE_HEADERS = {'Cache-Control': 'no-store, max-age=0'};

export function correlationId(request: Request) {
  const supplied = request.headers.get('x-correlation-id')?.trim();
  return supplied && /^[a-zA-Z0-9._-]{8,100}$/.test(supplied) ? supplied : crypto.randomUUID();
}

export function requestOriginIsAllowed(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return process.env.NODE_ENV !== 'production';
  const allowed = new Set([new URL(request.url).origin]);
  const configured = process.env.PORTAL_ORIGIN?.trim();
  if (configured) {
    try { allowed.add(new URL(configured).origin); } catch { return false; }
  }
  return allowed.has(origin);
}

export function csrfError() {
  return NextResponse.json({error: 'De aanvraag kwam niet van de portal.', code: 'invalid_origin'}, {
    status: 403,
    headers: NO_STORE_HEADERS,
  });
}

export function jsonError(message: string, code: string, status: number, id?: string) {
  return NextResponse.json({error: message, code, correlationId: id}, {
    status,
    headers: {...NO_STORE_HEADERS, ...(id ? {'X-Correlation-Id': id} : {})},
  });
}

export function safeLog(level: 'info' | 'warn' | 'error', event: string, details: Record<string, string | number | boolean | null | undefined>) {
  const line = JSON.stringify({timestamp: new Date().toISOString(), level, event, ...details});
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}
