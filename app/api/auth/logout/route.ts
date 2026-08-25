import {NextResponse} from 'next/server';
import {PORTAL_SESSION_COOKIE} from '@/lib/auth-token';
import {csrfError, NO_STORE_HEADERS, requestOriginIsAllowed} from '@/lib/http-security';

export async function POST(request: Request) {
  if (!requestOriginIsAllowed(request)) return csrfError();
  const response = NextResponse.json({ok: true}, {headers: NO_STORE_HEADERS});
  response.cookies.set(PORTAL_SESSION_COOKIE, '', {httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0});
  return response;
}
