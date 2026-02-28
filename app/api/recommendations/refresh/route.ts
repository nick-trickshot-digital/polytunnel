import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const { getAnthropicClient, AI_MODEL } = await import('@/lib/ai/client');
    const { BASE_SYSTEM_PROMPT } = await import('@/lib/ai/system-prompt');
    const { buildTunnelContext } = await import('@/lib/ai/context-builder');
    const { RECOMMENDATION_PROMPT } = await import('@/lib/ai/prompts');

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

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Recommendations refresh error:', error);
    return NextResponse.json({ error: 'Failed to refresh' }, { status: 500 });
  }
}
