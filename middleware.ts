import {NextResponse, type NextRequest} from 'next/server';
import {getPortalUserById} from './lib/auth-config';
import {PORTAL_SESSION_COOKIE, verifyPortalSession} from './lib/auth-token';

const publicPaths = ['/login', '/api/auth/login', '/api/health', '/robots.txt', '/manifest.webmanifest', '/icon.svg', '/favicon.ico'];
const developmentScriptPolicy = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';
const edgeSecurityHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Security-Policy': `default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self' data:; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: blob:; media-src 'self'; object-src 'none'; script-src 'self' 'unsafe-inline'${developmentScriptPolicy}; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests`,
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-DNS-Prefetch-Control': 'off',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex',
};

function isPublic(pathname: string) {
  return publicPaths.includes(pathname) || pathname.startsWith('/brand/');
}

function secure(response: NextResponse) {
  for (const [name, value] of Object.entries(edgeSecurityHeaders)) response.headers.set(name, value);
  return response;
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
  if (pathname === '/login' && session) return secure(NextResponse.redirect(new URL('/', request.url)));
  if (isPublic(pathname)) return secure(NextResponse.next());
  if (session) return secure(NextResponse.next());

  if (pathname.startsWith('/api/')) {
    return secure(NextResponse.json({error: 'Authenticatie vereist.', code: 'unauthorized'}, {
      status: 401,
      headers: {'Cache-Control': 'no-store'},
    }));
  }

  const login = new URL('/login', request.url);
  if (pathname !== '/') login.searchParams.set('next', `${pathname}${request.nextUrl.search}`.slice(0, 1_000));
  const response = NextResponse.redirect(login);
  if (token) response.cookies.delete(PORTAL_SESSION_COOKIE);
  return secure(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
