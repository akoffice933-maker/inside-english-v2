/**
 * OpenRouter LLM Aggregator Integration Utility.
 * 
 * Centralizes all LLM completions for Inside English v2.0.
 * Allows seamless hot-swapping between top-tier models (OpenAI GPT-4o, Claude 3.5 Sonnet, Llama 3)
 * without modifying routing code, simply by updating the NEXT_PUBLIC_OPENROUTER_MODEL env variable.
 */

import { fetchWithTimeout } from '@/lib/fetch-utils';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const DEFAULT_MODEL = process.env.NEXT_PUBLIC_OPENROUTER_MODEL || 'openai/gpt-4o';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Sends a chat completion request to the OpenRouter API.
 * 
 * @param messages Array of { role, content } conversation history
 * @param jsonMode If true, enforces structured JSON output formatting
 * @param customModel Optional model override string (e.g. "anthropic/claude-3.5-sonnet")
 */
export async function requestOpenRouter(
  messages: Message[],
  jsonMode: boolean = false,
  customModel?: string
) {
  const model = customModel || DEFAULT_MODEL;

  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured on the host server.');
  }

  console.log(`[OpenRouter API] Routing completion to model: "${model}" (JSON Mode: ${jsonMode})`);

  const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      // OpenRouter ranking metrics headers (Required)
      'HTTP-Referer': 'https://inside-english.io',
      'X-Title': 'Inside English v2.0',
    },
    body: JSON.stringify({
      model,
      messages,
      ...(jsonMode && {
        response_format: { type: 'json_object' }
      })
    }),
  }, 12000); // 12-second timeout guard prevents hanging serverless execution costs (Vulnerability Fix #2)

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter responded with status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  if (!data.choices || data.choices.length === 0) {
    throw new Error('Invalid empty response from OpenRouter API.');
  }

  return data;
}
