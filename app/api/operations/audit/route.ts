import {NextResponse} from 'next/server';
import {requireRequestPortalSession} from '@/lib/auth-server';
import {withTenantTransaction} from '@/lib/database';
import {jsonError, NO_STORE_HEADERS} from '@/lib/http-security';

export async function GET(request: Request) {
  const session = await requireRequestPortalSession(request, 'admin');
  if (!session) return jsonError('Alleen beheerders kunnen het auditlog bekijken.', 'forbidden', 403);
  try {
    const rows = await withTenantTransaction(session.tenantId, (transaction) => transaction`
      select action, entity_type, entity_id, actor_user_id, actor_role, correlation_id, created_at
      from portal_audit_log
      where tenant_id = ${session.tenantId}
      order by created_at desc
      limit 100
    `);
    return NextResponse.json({events: rows}, {headers: NO_STORE_HEADERS});
  } catch {
    return jsonError('Het auditlog kon niet worden geladen.', 'audit_read_failed', 503);
  }
}
