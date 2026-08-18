import 'server-only';

import OpenAI, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
} from 'openai';

export const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || 'gpt-5.6-luna';

export type PublicOpenAIError = {
  code: 'invalid_api_key' | 'model_access' | 'insufficient_quota' | 'rate_limit' | 'connection' | 'openai_error';
  message: string;
  status: number;
};

export function getOpenAIApiKey() {
  return process.env.OPENAI_API_KEY?.trim() || '';
}

export function createOpenAIClient() {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) return null;
  return new OpenAI({apiKey, timeout: 25_000, maxRetries: 2});
}

export function publicOpenAIError(error: unknown): PublicOpenAIError {
  if (error instanceof AuthenticationError) {
    return {
      code: 'invalid_api_key',
      message: 'De OpenAI API-sleutel is ongeldig of ingetrokken. Maak een nieuwe sleutel aan en herstart de app.',
      status: 401,
    };
  }
  if (error instanceof PermissionDeniedError) {
    return {
      code: 'model_access',
      message: `Deze API-account heeft geen toegang tot ${OPENAI_MODEL}. Controleer projectrechten en facturatie.`,
      status: 403,
    };
  }
  if (error instanceof RateLimitError) {
    if (error.code === 'insufficient_quota' || error.type === 'insufficient_quota') {
      return {
        code: 'insufficient_quota',
        message: 'De sleutel werkt, maar dit OpenAI-project heeft geen beschikbaar API-tegoed. Voeg een klein tegoed toe of verhoog de harde projectlimiet.',
        status: 429,
      };
    }
    return {
      code: 'rate_limit',
      message: 'De OpenAI-limiet of het beschikbare API-tegoed is bereikt. Controleer usage en billing en probeer daarna opnieuw.',
      status: 429,
    };
  }
  if (error instanceof APIConnectionTimeoutError || error instanceof APIConnectionError) {
    return {
      code: 'connection',
      message: 'De server kon OpenAI niet tijdig bereiken. Controleer de internetverbinding en probeer opnieuw.',
      status: 503,
    };
  }
  if (error instanceof APIError) {
    return {
      code: 'openai_error',
      message: 'OpenAI heeft de aanvraag geweigerd. Controleer modeltoegang, projectlimieten en API-configuratie.',
      status: error.status && error.status >= 400 && error.status < 600 ? error.status : 502,
    };
  }
  return {
    code: 'openai_error',
    message: 'De AI-service is tijdelijk niet beschikbaar. Probeer het later opnieuw.',
    status: 500,
  };
}
