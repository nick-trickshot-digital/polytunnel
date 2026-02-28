import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks, plantings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const taskId = parseInt(id);

    const updates: Record<string, unknown> = {};
    if (body.isCompleted !== undefined) {
      updates.isCompleted = body.isCompleted;
      updates.completedAt = body.isCompleted ? new Date() : null;
    }
    if (body.title) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.dueDate !== undefined) updates.dueDate = body.dueDate;
    if (body.category) updates.category = body.category;
    if (body.priority) updates.priority = body.priority;

    const result = await db.update(tasks)
      .set(updates)
      .where(eq(tasks.id, taskId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = result[0];

    // Chain feeding tasks: when a feeding task is completed, create the next one
    if (body.isCompleted && task.category === 'feeding' && task.plantingId) {
      try {
        const linked = await db.select().from(plantings).where(eq(plantings.id, task.plantingId));
        if (linked.length > 0 && (linked[0].status === 'growing' || linked[0].status === 'harvesting')) {
          const { getFeedingInfo } = await import('@/lib/plants/database');
          const feeding = getFeedingInfo(linked[0].plantName);
          if (feeding) {
            const nextDue = new Date();
            nextDue.setDate(nextDue.getDate() + feeding.intervalDays);
            await db.insert(tasks).values({
              plantingId: task.plantingId,
              title: task.title,
              category: 'feeding',
              priority: task.priority,
              dueDate: nextDue.toISOString().split('T')[0],
              isAiGenerated: true,
            });
          }
        }
      } catch { /* skip if plant db unavailable */ }
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id);

    const result = await db.delete(tasks)
      .where(eq(tasks.id, taskId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
