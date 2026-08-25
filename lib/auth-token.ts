import {SignJWT} from 'jose/jwt/sign';
import {jwtVerify} from 'jose/jwt/verify';

export const PORTAL_SESSION_COOKIE = 'inco_portal_session';

export type PortalRole = 'viewer' | 'editor' | 'admin';

export type PortalSession = {
  userId: string;
  login: string;
  displayName: string;
  role: PortalRole;
  tenantId: string;
  sessionVersion: number;
  expiresAt: number;
};

const roleWeight: Record<PortalRole, number> = {viewer: 0, editor: 1, admin: 2};

function secretKey() {
  const value = process.env.PORTAL_SESSION_SECRET?.trim();
  if (!value || value.length < 32) return null;
  return new TextEncoder().encode(value);
}

function sessionHours() {
  const parsed = Number.parseInt(process.env.PORTAL_SESSION_HOURS ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 24 ? parsed : 8;
}

export function isRoleAtLeast(role: PortalRole, required: PortalRole) {
  return roleWeight[role] >= roleWeight[required];
}

export async function issuePortalSession(value: Omit<PortalSession, 'expiresAt'>) {
  const secret = secretKey();
  if (!secret) throw new Error('PORTAL_SESSION_SECRET moet minimaal 32 tekens bevatten.');
  const maxAge = sessionHours() * 60 * 60;
  const expiresAt = Math.floor(Date.now() / 1_000) + maxAge;
  const token = await new SignJWT({
    login: value.login,
    name: value.displayName,
    role: value.role,
    tenantId: value.tenantId,
    sessionVersion: value.sessionVersion,
  })
    .setProtectedHeader({alg: 'HS256', typ: 'JWT'})
    .setSubject(value.userId)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .setIssuer('inco-source-operations-portal')
    .setAudience('inco-source-portal')
    .sign(secret);
  return {token, maxAge, expiresAt};
}

export async function verifyPortalSession(token: string | undefined): Promise<PortalSession | null> {
  const secret = secretKey();
  if (!secret || !token) return null;
  try {
    const {payload} = await jwtVerify(token, secret, {
      issuer: 'inco-source-operations-portal',
      audience: 'inco-source-portal',
      algorithms: ['HS256'],
    });
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.login !== 'string' ||
      typeof payload.name !== 'string' ||
      !['viewer', 'editor', 'admin'].includes(String(payload.role)) ||
      typeof payload.tenantId !== 'string' ||
      typeof payload.sessionVersion !== 'number' ||
      typeof payload.exp !== 'number'
    ) return null;
    return {
      userId: payload.sub,
      login: payload.login,
      displayName: payload.name,
      role: payload.role as PortalRole,
      tenantId: payload.tenantId,
      sessionVersion: payload.sessionVersion,
      expiresAt: payload.exp,
    };
  } catch {
    return null;
  }
}
