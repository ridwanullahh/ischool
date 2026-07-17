/**
 * Shared AI Config Helper
 * 
 * Provides a single function to get AI provider configuration
 * from either database or environment variables.
 * 
 * Used by: ai.ts, ai-write.ts, ai-setup.ts, email.ts, social.ts, gmb.ts
 */

import { getDb } from './db/index.js';
import { aiApiKeys, aiModels, aiProviders } from './db/schema.js';
import { eq, and } from 'drizzle-orm';
import { decrypt } from './security.js';

export interface AIConfig {
  apiKey: string;
  baseUrl: string;
  modelId: string;
}

/**
 * Get AI configuration. Tries database first, falls back to env vars.
 */
export function getAIConfig(): AIConfig | null {
  // First try database-configured provider
  const db = getDb();
  try {
    const keyRow = db.select().from(aiApiKeys).where(eq(aiApiKeys.isActive, true)).get();
    const modelRow = db.select().from(aiModels).where(eq(aiModels.isActive, true)).get();
    const providerRow = keyRow ? db.select().from(aiProviders).where(eq(aiProviders.id, keyRow.providerId)).get() : null;
    if (keyRow && providerRow) {
      let apiKey = keyRow.apiKey;
      try { apiKey = decrypt(apiKey); } catch {}
      return {
        apiKey,
        baseUrl: providerRow.baseUrl || 'https://api.openai.com/v1',
        modelId: modelRow?.modelId || 'gpt-4o-mini',
      };
    }
  } catch {}

  // Fallback to environment variables
  const envKey = import.meta.env.AI_API_KEY || process.env.AI_API_KEY;
  const envBaseUrl = import.meta.env.AI_BASE_URL || process.env.AI_BASE_URL;
  const envModel = import.meta.env.AI_MODEL || process.env.AI_MODEL;
  if (envKey && envBaseUrl) {
    return { apiKey: envKey, baseUrl: envBaseUrl, modelId: envModel || 'gpt-4o-mini' };
  }

  return null;
}

/**
 * Make a chat completion request to the AI provider.
 */
export async function chatCompletion(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; maxTokens?: number; tools?: any; toolChoice?: string },
): Promise<any> {
  const config = getAIConfig();
  if (!config) throw new Error('AI not configured');

  const body: any = {
    model: config.modelId,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 4096,
  };
  if (options?.tools) {
    body.tools = options.tools;
    body.tool_choice = options.toolChoice || 'auto';
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error ${response.status}: ${errorText}`);
  }

  return response.json();
}
