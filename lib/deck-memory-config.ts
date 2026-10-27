import 'server-only';

export function deckMemoriesEnabled() { return process.env.DECK_MEMORIES_ENABLED === 'true'; }
export function readerConfiguration() {
  return {
    google: { name: 'Google Gemini', model: process.env.DECK_GOOGLE_MODEL || 'gemini-3.8-flash', available: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) },
    openai: { name: 'OpenAI', model: process.env.DECK_OPENAI_MODEL || 'gpt-6.1-sol', available: Boolean(process.env.OPENAI_API_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) },
  };
}
export function positiveSetting(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
