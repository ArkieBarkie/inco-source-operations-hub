import {NextResponse} from 'next/server';
import {z} from 'zod';
import {writeAuditLog} from '@/lib/audit-log';
import {portalDataMode} from '@/lib/auth-config';
import {requireRequestPortalSession} from '@/lib/auth-server';
import {withTenantTransaction} from '@/lib/database';
import {correlationId, csrfError, jsonError, NO_STORE_HEADERS, requestOriginIsAllowed, safeLog} from '@/lib/http-security';
import {safeOperationsData} from '@/lib/operations-schema';
import {seedOperations} from '@/data/operations';
import type {OperationsData} from '@/types/operations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  expectedVersion: z.number().int().min(0),
  clientMutationId: z.string().uuid(),
  data: z.unknown(),
});

export async function GET(request: Request) {
  const session = await requireRequestPortalSession(request);
  if (!session) return jsonError('Authenticatie vereist.', 'unauthorized', 401);
  if (portalDataMode() === 'demo') return NextResponse.json({mode: 'demo', data: null, version: 0}, {headers: NO_STORE_HEADERS});
  const id = correlationId(request);
  try {
    const rows = await withTenantTransaction(session.tenantId, (transaction) => transaction`
      select version, data, updated_at from portal_operation_snapshots where tenant_id = ${session.tenantId}
    `);
    const row = rows[0];
    const data = row ? safeOperationsData(row.data) : null;
    if (row && !data?.success) throw new Error('De opgeslagen portaldata voldoet niet aan het actuele schema.');
    return NextResponse.json({
      mode: 'database',
      data: data?.success ? data.data : seedOperations,
      version: row ? Number(row.version) : 0,
      updatedAt: row?.updated_at ?? null,
    }, {headers: {...NO_STORE_HEADERS, 'X-Correlation-Id': id}});
  } catch (error) {
    safeLog('error', 'operations_read_failed', {correlationId: id, tenantId: session.tenantId, reason: error instanceof Error ? error.message : 'unknown'});
    return jsonError('De centrale portaldata kon niet veilig worden geladen.', 'data_read_failed', 503, id);
  }
}

export async function PUT(request: Request) {
  const session = await requireRequestPortalSession(request, 'editor');
  if (!session) return jsonError('Je hebt geen schrijfrechten voor deze portal.', 'forbidden', 403);
  if (!requestOriginIsAllowed(request)) return csrfError();
  if (portalDataMode() !== 'database') return jsonError('Centrale opslag is niet actief in de demo-stand.', 'demo_mode', 409);
  const id = correlationId(request);
  let raw = '';
  try {
    raw = await request.text();
    if (raw.length > 5_000_000) return jsonError('De dataset is te groot.', 'request_too_large', 413, id);
    const body = updateSchema.parse(JSON.parse(raw));
    const parsed = safeOperationsData(body.data);
    if (!parsed.success) return jsonError(`Ongeldige operationele gegevens: ${parsed.error.issues[0]?.message ?? 'schemafout'}`, 'invalid_operations_data', 400, id);

    const outcome = await withTenantTransaction(session.tenantId, async (transaction) => {
      const duplicate = await transaction`
        select 1 from portal_audit_log where tenant_id = ${session.tenantId} and client_mutation_id = ${body.clientMutationId} limit 1
      `;
      if (duplicate.length) {
        const current = await transaction`select version, data, updated_at from portal_operation_snapshots where tenant_id = ${session.tenantId}`;
        return {kind: 'saved' as const, row: current[0]};
      }

      const currentRows = await transaction`
        select version, data from portal_operation_snapshots where tenant_id = ${session.tenantId} for update
      `;
      const current = currentRows[0];
      const currentVersion = current ? Number(current.version) : 0;
      if (currentVersion !== body.expectedVersion) return {kind: 'conflict' as const, row: current};

      const nextVersion = currentVersion + 1;
      const rows = current
        ? await transaction`
            update portal_operation_snapshots
            set version = ${nextVersion}, data = ${transaction.json(parsed.data as never)}, updated_at = now(), updated_by = ${session.userId}
            where tenant_id = ${session.tenantId}
            returning version, data, updated_at
          `
        : await transaction`
            insert into portal_operation_snapshots (tenant_id, version, data, updated_by)
            values (${session.tenantId}, ${nextVersion}, ${transaction.json(parsed.data as never)}, ${session.userId})
            returning version, data, updated_at
          `;
      await writeAuditLog(transaction, session, {
        action: current ? 'operations.snapshot.updated' : 'operations.snapshot.created',
        entityType: 'operations_snapshot',
        entityId: session.tenantId,
        correlationId: id,
        clientMutationId: body.clientMutationId,
        beforeState: current?.data,
        afterState: parsed.data,
      });
      return {kind: 'saved' as const, row: rows[0]};
    });

    if (outcome.kind === 'conflict') return NextResponse.json({
      error: 'De gegevens zijn intussen door een andere gebruiker gewijzigd. Herlaad voordat je opnieuw opslaat.',
      code: 'version_conflict',
      current: outcome.row ? {version: Number(outcome.row.version), data: outcome.row.data} : {version: 0, data: seedOperations},
      correlationId: id,
    }, {status: 409, headers: {...NO_STORE_HEADERS, 'X-Correlation-Id': id}});

    return NextResponse.json({
      ok: true,
      version: Number(outcome.row.version),
      data: outcome.row.data as OperationsData,
      updatedAt: outcome.row.updated_at,
    }, {headers: {...NO_STORE_HEADERS, 'X-Correlation-Id': id}});
  } catch (error) {
    safeLog('error', 'operations_write_failed', {correlationId: id, tenantId: session.tenantId, reason: error instanceof Error ? error.message : 'unknown', bytes: raw.length});
    return jsonError('De wijziging kon niet veilig worden opgeslagen.', 'data_write_failed', 500, id);
  }
}
