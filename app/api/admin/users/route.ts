import {NextResponse} from 'next/server';
import {getPortalUsers} from '@/lib/auth-config';
import {requireRequestPortalSession} from '@/lib/auth-server';
import {jsonError, NO_STORE_HEADERS} from '@/lib/http-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await requireRequestPortalSession(request, 'admin');
  if (!session) return jsonError('Alleen beheerders kunnen accounts bekijken.', 'forbidden', 403);
  try {
    const users = getPortalUsers()
      .filter((user) => user.tenantId === session.tenantId)
      .map(({passwordHash: _passwordHash, ...user}) => user)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'nl-NL'));
    return NextResponse.json({users}, {headers: NO_STORE_HEADERS});
  } catch {
    return jsonError('De accountconfiguratie is ongeldig.', 'auth_not_configured', 503);
  }
}
