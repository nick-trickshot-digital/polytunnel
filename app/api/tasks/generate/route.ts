import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks, plantings } from '@/lib/db/schema';
import { getAnthropicClient, AI_MODEL } from '@/lib/ai/client';
import { BASE_SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import { buildTunnelContext } from '@/lib/ai/context-builder';

export async function POST() {
  try {
    const anthropic = getAnthropicClient();
    const tunnelContext = await buildTunnelContext();

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      system: `${BASE_SYSTEM_PROMPT}\n\n--- CURRENT STATE ---\n${tunnelContext}`,
      messages: [{
        role: 'user',
        content: `Based on the current tunnel state, weather, and time of year, generate specific tasks that Ant should do in the next 1-2 weeks. Consider: watering needs, feeding schedules, pest checks, ventilation, harvesting, and any weather-related actions.

Format as a JSON array (nothing else):
[{"title":"...","description":"...","dueDate":"YYYY-MM-DD","category":"watering|feeding|ventilation|sowing|harvesting|maintenance|pest-control","priority":"low|medium|high|urgent"}]`,
      }],
    });

    let text = response.content[0].type === 'text' ? response.content[0].text : '';
    // Strip markdown code fences and trim
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    let generatedTasks;
    try {
      // Try direct parse first (if response is clean JSON)
      generatedTasks = JSON.parse(text);
    } catch {
      // Fall back to regex extraction
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.error('Task generation: no JSON array found in:', text.substring(0, 300));
        }
        generatedTasks = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch (parseErr) {
        console.error('Task generation: JSON parse failed:', parseErr);
        generatedTasks = [];
      }
    }
    if (!Array.isArray(generatedTasks)) generatedTasks = [];

    // Insert generated tasks
    const inserted = [];
    for (const task of generatedTasks) {
      const result = await db.insert(tasks).values({
        title: task.title,
        description: task.description || null,
        dueDate: task.dueDate || null,
        category: task.category || 'maintenance',
        priority: task.priority || 'medium',
        isAiGenerated: true,
      }).returning();
      inserted.push(result[0]);
    }

    return NextResponse.json({ generated: inserted.length, tasks: inserted });
  } catch (error) {
    console.error('Task generation error:', error);
    return NextResponse.json({ error: 'Failed to generate tasks' }, { status: 500 });
  }
}
