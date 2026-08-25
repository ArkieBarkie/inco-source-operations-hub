import {NextResponse} from 'next/server';
import {getPortalUsers, portalDataMode} from '@/lib/auth-config';
import {databaseHealth} from '@/lib/database';
import {NO_STORE_HEADERS} from '@/lib/http-security';

export const dynamic = 'force-dynamic';

export async function GET() {
  const commit = (process.env.RELEASE_COMMIT || process.env.COMMIT_REF || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown').slice(0, 12);
  const mode = portalDataMode();
  let authConfigured = false;
  try {
    const users = getPortalUsers();
    authConfigured = (process.env.PORTAL_SESSION_SECRET?.trim().length ?? 0) >= 32
      && users.some((user) => user.active && user.role === 'admin')
      && users.some((user) => user.active && (user.role === 'editor' || user.role === 'admin'));
  } catch {
    authConfigured = false;
  }
  let database: 'not-required' | 'ok' | 'unavailable' = 'not-required';
  if (mode === 'database') {
    try { await databaseHealth(); database = 'ok'; } catch { database = 'unavailable'; }
  }
  const ready = authConfigured && database !== 'unavailable';
  return NextResponse.json({
    status: ready ? 'ok' : 'degraded',
    release: commit,
    dataMode: mode,
    authConfigured,
    database,
  }, {status: ready ? 200 : 503, headers: NO_STORE_HEADERS});
}
