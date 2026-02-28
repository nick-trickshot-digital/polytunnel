import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatMessages } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const messages = await db.select().from(chatMessages)
      .orderBy(desc(chatMessages.createdAt))
      .limit(50);

    return NextResponse.json(messages.reverse());
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await db.delete(chatMessages);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to clear chat history:', error);
    return NextResponse.json({ error: 'Failed to clear chat history' }, { status: 500 });
  }
}
