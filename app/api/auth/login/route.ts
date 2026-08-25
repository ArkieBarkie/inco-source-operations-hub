import {compare} from 'bcryptjs';
import {NextResponse} from 'next/server';
import {getPortalUserByLogin} from '@/lib/auth-config';
import {issuePortalSession, PORTAL_SESSION_COOKIE} from '@/lib/auth-token';
import {csrfError, jsonError, NO_STORE_HEADERS, requestOriginIsAllowed, safeLog} from '@/lib/http-security';
import {requestClientAddress, takeRateLimit} from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Keep the password-check cost comparable when an account does not exist.
const DUMMY_PASSWORD_HASH = '$2b$12$kN1vEtwr/YN.jdn6oAftv.nyMJiG8sVv3doQDYZHxzAFGXhyUmmBi';

export async function POST(request: Request) {
  if (!requestOriginIsAllowed(request)) return csrfError();
  const quota = await takeRateLimit('login', requestClientAddress(request), [{seconds: 15 * 60, limit: 8}, {seconds: 24 * 60 * 60, limit: 50}]);
  if (!quota.allowed) return NextResponse.json({error: 'Te veel inlogpogingen. Probeer later opnieuw.', code: 'login_rate_limit'}, {status: 429, headers: {...NO_STORE_HEADERS, ...quota.headers}});

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 10_000) return jsonError('De aanvraag is te groot.', 'request_too_large', 413);
    body = JSON.parse(raw);
  } catch {
    return jsonError('Ongeldige aanvraag.', 'invalid_request', 400);
  }
  const login = typeof (body as {login?: unknown})?.login === 'string' ? (body as {login: string}).login.trim().slice(0, 64) : '';
  const password = typeof (body as {password?: unknown})?.password === 'string' ? (body as {password: string}).password.slice(0, 500) : '';
  if (!login || !password) return jsonError('Vul accountnaam en wachtwoord in.', 'missing_credentials', 400);
  const accountQuota = await takeRateLimit('login-account', login.toLocaleLowerCase('nl-NL'), [{seconds: 30 * 60, limit: 10}, {seconds: 24 * 60 * 60, limit: 30}]);
  if (!accountQuota.allowed) return NextResponse.json({error: 'Te veel inlogpogingen. Probeer later opnieuw.', code: 'login_rate_limit'}, {status: 429, headers: {...NO_STORE_HEADERS, ...accountQuota.headers}});

  let user;
  try { user = getPortalUserByLogin(login); } catch {
    safeLog('error', 'auth_configuration_invalid', {client: requestClientAddress(request)});
    return jsonError('De portalbeveiliging is nog niet correct geconfigureerd.', 'auth_not_configured', 503);
  }
  const valid = await compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !valid) {
    safeLog('warn', 'login_failed', {client: requestClientAddress(request)});
    return NextResponse.json({error: 'Accountnaam of wachtwoord is onjuist.', code: 'invalid_credentials'}, {status: 401, headers: {...NO_STORE_HEADERS, ...quota.headers, ...accountQuota.headers}});
  }

  const session = await issuePortalSession({
    userId: user.id,
    login: user.login,
    displayName: user.displayName,
    role: user.role,
    tenantId: user.tenantId,
    sessionVersion: user.sessionVersion,
  });
  const response = NextResponse.json({ok: true, user: {displayName: user.displayName, role: user.role}}, {headers: {...NO_STORE_HEADERS, ...quota.headers, ...accountQuota.headers}});
  response.cookies.set(PORTAL_SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: session.maxAge,
  });
  safeLog('info', 'login_succeeded', {userId: user.id, tenantId: user.tenantId});
  return response;
}
