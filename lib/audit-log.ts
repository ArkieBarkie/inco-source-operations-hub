import 'server-only';

import type {DatabaseTransaction} from './database';
import type {PortalSession} from './auth-token';

export type AuditEvent = {
  action: string;
  entityType: string;
  entityId?: string;
  correlationId: string;
  clientMutationId?: string;
  beforeState?: unknown;
  afterState?: unknown;
};

export async function writeAuditLog(transaction: DatabaseTransaction, session: PortalSession, event: AuditEvent) {
  await transaction`
    insert into portal_audit_log (
      tenant_id, actor_user_id, actor_login, actor_role, action, entity_type,
      entity_id, correlation_id, client_mutation_id, before_state, after_state
    ) values (
      ${session.tenantId}, ${session.userId}, ${session.login}, ${session.role}, ${event.action}, ${event.entityType},
      ${event.entityId ?? null}, ${event.correlationId}, ${event.clientMutationId ?? null},
      ${event.beforeState === undefined ? null : transaction.json(event.beforeState as never)},
      ${event.afterState === undefined ? null : transaction.json(event.afterState as never)}
    )
    on conflict (tenant_id, client_mutation_id) where client_mutation_id is not null do nothing
  `;
}
