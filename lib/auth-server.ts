import 'server-only';

import {cookies} from 'next/headers';
import {getPortalUserById} from './auth-config';
import {isRoleAtLeast, PORTAL_SESSION_COOKIE, type PortalRole, type PortalSession, verifyPortalSession} from './auth-token';

function cookieValue(header: string | null, name: string) {
  if (!header) return undefined;
  return header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

async function activeSession(session: PortalSession | null) {
  if (!session) return null;
  try {
    const user = getPortalUserById(session.userId);
    if (
      !user ||
      user.sessionVersion !== session.sessionVersion ||
      user.tenantId !== session.tenantId ||
      user.role !== session.role ||
      user.login !== session.login ||
      user.displayName !== session.displayName
    ) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getServerPortalSession() {
  const store = await cookies();
  return activeSession(await verifyPortalSession(store.get(PORTAL_SESSION_COOKIE)?.value));
}

export async function getRequestPortalSession(request: Request) {
  const token = cookieValue(request.headers.get('cookie'), PORTAL_SESSION_COOKIE);
  return activeSession(await verifyPortalSession(token));
}

export async function requireRequestPortalSession(request: Request, role: PortalRole = 'viewer') {
  const session = await getRequestPortalSession(request);
  if (!session || !isRoleAtLeast(session.role, role)) return null;
  return session;
}
