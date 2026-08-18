import {NextResponse} from 'next/server';
import {COPILOT_RATE_LIMITS, takeCopilotQuota} from '@/lib/copilot-rate-limit';
import {createOpenAIClient, getOpenAIApiKey, OPENAI_MODEL, publicOpenAIError} from '@/lib/openai-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStoreHeaders = {'Cache-Control': 'no-store, max-age=0'};

export async function GET() {
  return NextResponse.json({
    configured: Boolean(getOpenAIApiKey()),
    model: OPENAI_MODEL,
    connection: 'unchecked',
    limits: COPILOT_RATE_LIMITS,
  }, {headers: noStoreHeaders});
}

export async function POST(request: Request) {
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

  const quota = takeCopilotQuota(request);
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
    console.error('OpenAI connection test failed:', publicError.code);
    return NextResponse.json({
      configured: true,
      model: OPENAI_MODEL,
      connection: 'error',
      limits: COPILOT_RATE_LIMITS,
      ...publicError,
    }, {status: publicError.status, headers: {...noStoreHeaders, ...quota.headers}});
  }
}
