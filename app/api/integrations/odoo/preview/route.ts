import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireRequestPortalSession} from '@/lib/auth-server';
import {OdooConnector} from '@/lib/connectors/odoo';
import {correlationId, csrfError, jsonError, NO_STORE_HEADERS, requestOriginIsAllowed, safeLog} from '@/lib/http-security';

const requestSchema = z.object({entity: z.enum(['articles', 'shipments']), cursor: z.string().max(100).optional()});

export async function POST(request: Request) {
  const session = await requireRequestPortalSession(request, 'admin');
  if (!session) return jsonError('Alleen beheerders kunnen een Odoo-preview uitvoeren.', 'forbidden', 403);
  if (!requestOriginIsAllowed(request)) return csrfError();
  const id = correlationId(request);
  try {
    const raw = await request.text();
    if (raw.length > 5_000) return jsonError('De aanvraag is te groot.', 'request_too_large', 413, id);
    const body = requestSchema.parse(JSON.parse(raw));
    const connector = new OdooConnector();
    const result = body.entity === 'articles' ? await connector.pullArticles(body.cursor) : await connector.pullShipments(body.cursor);
    safeLog('info', 'odoo_preview_completed', {correlationId: id, tenantId: session.tenantId, entity: body.entity, records: result.records.length});
    return NextResponse.json({...result, records: result.records.slice(0, 20), previewOnly: true}, {headers: {...NO_STORE_HEADERS, 'X-Correlation-Id': id}});
  } catch (error) {
    safeLog('warn', 'odoo_preview_failed', {correlationId: id, tenantId: session.tenantId, reason: error instanceof Error ? error.message : 'unknown'});
    return jsonError(error instanceof Error ? error.message : 'Odoo-preview is mislukt.', 'odoo_preview_failed', 503, id);
  }
}
