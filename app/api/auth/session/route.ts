import {NextResponse} from 'next/server';
import {getRequestPortalSession} from '@/lib/auth-server';
import {NO_STORE_HEADERS} from '@/lib/http-security';

export async function GET(request: Request) {
  const session = await getRequestPortalSession(request);
  if (!session) return NextResponse.json({authenticated: false}, {status: 401, headers: NO_STORE_HEADERS});
  return NextResponse.json({authenticated: true, user: session}, {headers: NO_STORE_HEADERS});
}
