import {NextResponse, type NextRequest} from 'next/server';
import {getPortalUserById} from './lib/auth-config';
import {PORTAL_SESSION_COOKIE, verifyPortalSession} from './lib/auth-token';

const publicPaths = ['/login', '/api/auth/login', '/api/health', '/robots.txt', '/manifest.webmanifest', '/icon.svg', '/favicon.ico'];

function isPublic(pathname: string) {
  return publicPaths.includes(pathname) || pathname.startsWith('/brand/');
}

export async function middleware(request: NextRequest) {
  const {pathname} = request.nextUrl;
  if (pathname.startsWith('/_next/')) return NextResponse.next();

  const token = request.cookies.get(PORTAL_SESSION_COOKIE)?.value;
  const signedSession = await verifyPortalSession(token);
  let session = null;
  if (signedSession) {
    try {
      const user = getPortalUserById(signedSession.userId);
      if (
        user &&
        user.sessionVersion === signedSession.sessionVersion &&
        user.tenantId === signedSession.tenantId &&
        user.role === signedSession.role &&
        user.login === signedSession.login &&
        user.displayName === signedSession.displayName
      ) session = signedSession;
    } catch {
      session = null;
    }
  }
  if (pathname === '/login' && session) return NextResponse.redirect(new URL('/', request.url));
  if (isPublic(pathname)) return NextResponse.next();
  if (session) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({error: 'Authenticatie vereist.', code: 'unauthorized'}, {
      status: 401,
      headers: {'Cache-Control': 'no-store'},
    });
  }

  const login = new URL('/login', request.url);
  if (pathname !== '/') login.searchParams.set('next', `${pathname}${request.nextUrl.search}`.slice(0, 1_000));
  const response = NextResponse.redirect(login);
  if (token) response.cookies.delete(PORTAL_SESSION_COOKIE);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
