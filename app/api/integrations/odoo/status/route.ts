import {NextResponse} from 'next/server';
import {requireRequestPortalSession} from '@/lib/auth-server';
import {OdooConnector, odooConfigurationStatus} from '@/lib/connectors/odoo';
import {correlationId, csrfError, jsonError, NO_STORE_HEADERS, requestOriginIsAllowed, safeLog} from '@/lib/http-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await requireRequestPortalSession(request, 'admin');
  if (!session) return jsonError('Alleen beheerders kunnen integratiestatus bekijken.', 'forbidden', 403);
  return NextResponse.json({...odooConfigurationStatus(), writeBackEnabled: false}, {headers: NO_STORE_HEADERS});
}

export async function POST(request: Request) {
  const session = await requireRequestPortalSession(request, 'admin');
  if (!session) return jsonError('Alleen beheerders kunnen de verbinding testen.', 'forbidden', 403);
  if (!requestOriginIsAllowed(request)) return csrfError();
  const id = correlationId(request);
  const result = await new OdooConnector().testConnection();
  safeLog(result.ok ? 'info' : 'warn', 'odoo_connection_tested', {correlationId: id, tenantId: session.tenantId, ok: result.ok});
  return NextResponse.json(result, {status: result.ok ? 200 : 503, headers: {...NO_STORE_HEADERS, 'X-Correlation-Id': id}});
}
