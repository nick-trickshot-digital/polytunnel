import { NextResponse } from 'next/server';
import { getAnthropicClient, AI_MODEL } from '@/lib/ai/client';
import { BASE_SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import { buildTunnelContext } from '@/lib/ai/context-builder';
import { RECOMMENDATION_PROMPT } from '@/lib/ai/prompts';

// Cache recommendations with stale-while-revalidate pattern
let cachedRecommendations: unknown[] | null = null;
let cacheTime = 0;
let isRefreshing = false;
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours fresh
const STALE_DURATION = 24 * 60 * 60 * 1000; // serve stale up to 24h while refreshing in background

async function refreshRecommendations() {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
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

    let recommendations;
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      recommendations = [];
    }

    cachedRecommendations = recommendations;
    cacheTime = Date.now();
  } catch (error) {
    console.error('Recommendations refresh error:', error);
  } finally {
    isRefreshing = false;
  }
}

export async function GET() {
  try {
    const age = Date.now() - cacheTime;

    // Fresh cache — return immediately
    if (cachedRecommendations && age < CACHE_DURATION) {
      return NextResponse.json(cachedRecommendations);
    }

    // Stale cache — return immediately but refresh in background
    if (cachedRecommendations && age < STALE_DURATION) {
      refreshRecommendations(); // fire-and-forget
      return NextResponse.json(cachedRecommendations);
    }

    // No cache at all — must wait for first fetch
    await refreshRecommendations();
    return NextResponse.json(cachedRecommendations || []);
  } catch (error) {
    console.error('Recommendations error:', error);
    return NextResponse.json(cachedRecommendations || []);
  }
}
