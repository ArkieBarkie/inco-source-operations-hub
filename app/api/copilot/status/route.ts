import {NextResponse} from 'next/server';
import {COPILOT_RATE_LIMITS, takeCopilotQuota} from '@/lib/copilot-rate-limit';
import {createOpenAIClient, getOpenAIApiKey, OPENAI_MODEL, publicOpenAIError} from '@/lib/openai-server';
import {requireRequestPortalSession} from '@/lib/auth-server';
import {csrfError, jsonError, requestOriginIsAllowed, safeLog} from '@/lib/http-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStoreHeaders = {'Cache-Control': 'no-store, max-age=0'};

export async function GET(request: Request) {
  const session = await requireRequestPortalSession(request);
  if (!session) return jsonError('Authenticatie vereist.', 'unauthorized', 401);
  return NextResponse.json({
    configured: Boolean(getOpenAIApiKey()),
    model: OPENAI_MODEL,
    connection: 'unchecked',
    limits: COPILOT_RATE_LIMITS,
  }, {headers: noStoreHeaders});
}

export async function POST(request: Request) {
  const session = await requireRequestPortalSession(request, 'admin');
  if (!session) return jsonError('Alleen beheerders kunnen de AI-verbinding testen.', 'forbidden', 403);
  if (!requestOriginIsAllowed(request)) return csrfError();
  const client = createOpenAIClient();
  if (!client) {
    return NextResponse.json({
      configured: false,
      model: OPENAI_MODEL,
      connection: 'missing_key',
      code: 'missing_api_key',
      message: 'OPENAI_API_KEY ontbreekt in .env.local.',
      limits: COPILOT_RATE_LIMITS,
    }, {status: 503, headers: noStoreHeaders});
  }

  const quota = await takeCopilotQuota(request, session);
  if (!quota.allowed) {
    return NextResponse.json({
      configured: true,
      model: OPENAI_MODEL,
      connection: 'error',
      code: 'copilot_rate_limit',
      message: `De gebruikslimiet is bereikt. Probeer over ongeveer ${Math.ceil(quota.retryAfterSeconds / 60)} minuten opnieuw.`,
      limits: COPILOT_RATE_LIMITS,
    }, {status: 429, headers: {...noStoreHeaders, ...quota.headers}});
  }

  try {
    const response = await client.responses.create({
      model: OPENAI_MODEL,
      input: 'Antwoord exact met: OK',
      reasoning: {effort: 'none'},
      text: {verbosity: 'low'},
      max_output_tokens: 32,
      store: false,
    });
    return NextResponse.json({
      configured: true,
      model: OPENAI_MODEL,
      connection: 'ok',
      checkedAt: new Date().toISOString(),
      limits: COPILOT_RATE_LIMITS,
      testUsage: response.usage ? {totalTokens: response.usage.total_tokens} : null,
    }, {headers: {...noStoreHeaders, ...quota.headers}});
  } catch (error) {
    const publicError = publicOpenAIError(error);
    safeLog('warn', 'openai_connection_test_failed', {tenantId: session.tenantId, userId: session.userId, code: publicError.code});
    return NextResponse.json({
      configured: true,
      model: OPENAI_MODEL,
      connection: 'error',
      limits: COPILOT_RATE_LIMITS,
      ...publicError,
    }, {status: publicError.status, headers: {...noStoreHeaders, ...quota.headers}});
  }
}
