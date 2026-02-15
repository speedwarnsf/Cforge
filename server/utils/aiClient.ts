/**
 * Shared AI client configuration
 * Prefers OpenAI when available; only falls back to Gemini if OPENAI_API_KEY is absent
 */
import OpenAI from 'openai';

// Prefer OpenAI if available; only use Gemini if OPENAI_API_KEY is absent
const useGemini = !process.env.OPENAI_API_KEY && !!process.env.GEMINI_API_KEY;

export const AI_MODEL = useGemini ? 'gemini-2.0-flash' : 'gpt-4o';

export function createAIClient(): OpenAI {
  return new OpenAI({
    apiKey: useGemini ? process.env.GEMINI_API_KEY : (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY),
    baseURL: useGemini ? "https://generativelanguage.googleapis.com/v1beta/openai/" : undefined,
  });
}

// Singleton for modules that use a global client
export const sharedAIClient = createAIClient();
