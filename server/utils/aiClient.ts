/**
 * Shared AI client configuration
 * Prefers OpenAI when available; only falls back to Gemini if OPENAI_API_KEY is absent
 * Uses lazy evaluation to avoid capturing env vars before dotenv loads
 */
import OpenAI from 'openai';

// Lazy evaluation - env vars may not be loaded at module eval time (ESM hoisting)
function isGemini(): boolean {
  return !process.env.OPENAI_API_KEY && !!process.env.GEMINI_API_KEY;
}

export function getAIModel(): string {
  return isGemini() ? 'gemini-2.0-flash' : 'gpt-4o';
}

// Keep as getter for backward compat
export const AI_MODEL = 'gemini-2.0-flash'; // Default; use getAIModel() for runtime

export function createAIClient(): OpenAI {
  const gemini = isGemini();
  return new OpenAI({
    apiKey: gemini ? process.env.GEMINI_API_KEY : (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY),
    baseURL: gemini ? "https://generativelanguage.googleapis.com/v1beta/openai/" : undefined,
  });
}

// Lazy singleton
let _sharedClient: OpenAI | null = null;
export function getSharedAIClient(): OpenAI {
  if (!_sharedClient) _sharedClient = createAIClient();
  return _sharedClient;
}
export const sharedAIClient = new Proxy({} as OpenAI, {
  get(_, prop) {
    return (getSharedAIClient() as any)[prop];
  }
});
