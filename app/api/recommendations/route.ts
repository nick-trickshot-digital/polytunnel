import { NextResponse } from 'next/server';
import { getAnthropicClient, AI_MODEL } from '@/lib/ai/client';
import { BASE_SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import { buildTunnelContext } from '@/lib/ai/context-builder';
import { RECOMMENDATION_PROMPT } from '@/lib/ai/prompts';

// Cache recommendations
let cachedRecommendations: unknown[] | null = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET() {
  try {
    // Return cached if fresh
    if (cachedRecommendations && Date.now() - cacheTime < CACHE_DURATION) {
      return NextResponse.json(cachedRecommendations);
    }

    const anthropic = getAnthropicClient();
    const tunnelContext = await buildTunnelContext();

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1500,
      system: `${BASE_SYSTEM_PROMPT}\n\n--- CURRENT STATE ---\n${tunnelContext}`,
      messages: [{
        role: 'user',
        content: RECOMMENDATION_PROMPT,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON from response (handle potential markdown wrapping)
    let recommendations;
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      recommendations = [];
    }

    cachedRecommendations = recommendations;
    cacheTime = Date.now();

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Recommendations error:', error);
    return NextResponse.json([]);
  }
}
