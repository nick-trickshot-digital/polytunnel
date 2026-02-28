import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { chatMessages } from '@/lib/db/schema';
import { getAnthropicClient, AI_MODEL } from '@/lib/ai/client';
import { BASE_SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import { buildTunnelContext } from '@/lib/ai/context-builder';
import { desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Save user message
    await db.insert(chatMessages).values({
      role: 'user',
      content: message,
    });

    // Get recent conversation history
    const history = await db.select().from(chatMessages)
      .orderBy(desc(chatMessages.createdAt))
      .limit(20);

    const messages = history.reverse().map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Build context
    const tunnelContext = await buildTunnelContext();
    const systemPrompt = `${BASE_SYSTEM_PROMPT}\n\n--- CURRENT STATE ---\n${tunnelContext}`;

    // Stream response
    const anthropic = getAnthropicClient();
    const stream = await anthropic.messages.stream({
      model: AI_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';

        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text;
              fullResponse += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }

          // Save assistant response
          if (fullResponse) {
            await db.insert(chatMessages).values({
              role: 'assistant',
              content: fullResponse,
            });
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process chat message' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
