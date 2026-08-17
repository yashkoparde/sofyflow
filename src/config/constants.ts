export const GROQ_API_KEY = (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.VITE_GROQ_API_KEY) || 'YOUR_GROQ_API_KEY';
export const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
export const MAX_HISTORY_ITEMS = 50;
