import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category');
    const completed = request.nextUrl.searchParams.get('completed');

    let allTasks;
    if (completed === 'true') {
      allTasks = await db.select().from(tasks)
        .where(eq(tasks.isCompleted, true))
        .orderBy(desc(tasks.completedAt));
    } else if (completed === 'false') {
      allTasks = await db.select().from(tasks)
        .where(eq(tasks.isCompleted, false))
        .orderBy(asc(tasks.dueDate));
    } else {
      allTasks = await db.select().from(tasks).orderBy(asc(tasks.dueDate));
    }

    if (category) {
      allTasks = allTasks.filter(t => t.category === category);
    }

    return NextResponse.json(allTasks);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, dueDate, category, priority, plantingId, isAiGenerated } = body;

    if (!title || !category) {
      return NextResponse.json({ error: 'title and category are required' }, { status: 400 });
    }

    const result = await db.insert(tasks).values({
      title,
      description: description || null,
      dueDate: dueDate || null,
      category,
      priority: priority || 'medium',
      plantingId: plantingId || null,
      isAiGenerated: isAiGenerated || false,
    }).returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
