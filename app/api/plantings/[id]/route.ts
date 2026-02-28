import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { plantings, cropHistory, harvests, tasks, photos } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getPlantFamily } from '@/lib/utils/rotation';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const plantingId = parseInt(id);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.variety !== undefined) updates.variety = body.variety;
    if (body.bedFraction) updates.bedFraction = body.bedFraction;

    // Activating a planned planting: set datePlanted and recalculate harvest dates
    if (body.status === 'growing') {
      const existing = await db.select().from(plantings).where(eq(plantings.id, plantingId));
      if (existing.length > 0 && existing[0].status === 'planned') {
        const today = new Date().toISOString().split('T')[0];
        updates.datePlanted = today;

        try {
          const { getPlantByName } = await import('@/lib/plants/database');
          const plantInfo = getPlantByName(existing[0].plantName);
          if (plantInfo) {
            const days = plantInfo.daysToHarvestFromTransplant || plantInfo.daysToHarvestFromSowing;
            if (days) {
              const base = new Date(today);
              const harvestStart = new Date(base);
              harvestStart.setDate(harvestStart.getDate() + days);
              updates.expectedHarvestStart = harvestStart.toISOString().split('T')[0];
              const harvestEnd = new Date(harvestStart);
              harvestEnd.setDate(harvestEnd.getDate() + (plantInfo.harvestWindowDays || 30));
              updates.expectedHarvestEnd = harvestEnd.toISOString().split('T')[0];
            }
          }
        } catch { /* skip if plant db unavailable */ }
      }
    }

    const result = await db.update(plantings)
      .set(updates)
      .where(eq(plantings.id, plantingId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Planting not found' }, { status: 404 });
    }

    const planting = result[0];

    // When a planting starts growing, create a feeding task if the plant needs feeding
    if (body.status === 'growing') {
      try {
        const { getFeedingInfo } = await import('@/lib/plants/database');
        const feeding = getFeedingInfo(planting.plantName);
        if (feeding) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + feeding.intervalDays);
          await db.insert(tasks).values({
            plantingId: planting.id,
            title: `Feed ${planting.plantName} in ${planting.bedId} (${feeding.type})`,
            category: 'feeding',
            priority: 'medium',
            dueDate: dueDate.toISOString().split('T')[0],
            isAiGenerated: true,
          });
        }
      } catch { /* skip if plant db unavailable */ }
    }

    // When a planting is finished, create a crop history entry and clean up tasks
    if (body.status === 'finished') {
      // Clean up any pending tasks (feeding reminders, etc.)
      await db.delete(tasks).where(and(eq(tasks.plantingId, plantingId), eq(tasks.isCompleted, false)));

      if (planting.datePlanted) {
        const plantedDate = new Date(planting.datePlanted);
        const month = plantedDate.getMonth() + 1;
        let season = 'spring';
        if (month >= 6 && month <= 8) season = 'summer';
        else if (month >= 9 && month <= 11) season = 'autumn';
        else if (month === 12 || month <= 2) season = 'winter';

        await db.insert(cropHistory).values({
          bedId: planting.bedId,
          plantName: planting.plantName,
          plantFamily: getPlantFamily(planting.plantName),
          year: plantedDate.getFullYear(),
          season,
          successRating: body.successRating || null,
          notes: body.finishNotes || null,
        });
      }
    }

    // When a planting fails, clean up pending tasks too
    if (body.status === 'failed') {
      await db.delete(tasks).where(and(eq(tasks.plantingId, plantingId), eq(tasks.isCompleted, false)));
    }

    return NextResponse.json(planting);
  } catch (error) {
    console.error('Failed to update planting:', error);
    return NextResponse.json({ error: 'Failed to update planting' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plantingId = parseInt(id);

    // Delete related records that have foreign keys to this planting
    await db.delete(harvests).where(eq(harvests.plantingId, plantingId));
    // Delete incomplete tasks linked to this planting (e.g. auto-generated plan reminders)
    await db.delete(tasks).where(and(eq(tasks.plantingId, plantingId), eq(tasks.isCompleted, false)));
    // Unlink any completed tasks so history is preserved
    await db.update(tasks).set({ plantingId: null }).where(eq(tasks.plantingId, plantingId));
    await db.update(photos).set({ plantingId: null }).where(eq(photos.plantingId, plantingId));

    const result = await db.delete(plantings)
      .where(eq(plantings.id, plantingId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Planting not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete planting:', error);
    return NextResponse.json({ error: 'Failed to delete planting' }, { status: 500 });
  }
}
