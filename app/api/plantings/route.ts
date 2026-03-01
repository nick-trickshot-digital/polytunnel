import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { plantings, tasks } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bedId, plantName: rawPlantName, variety, datePlanted, dateSown, bedFraction, notes,
            mode, plannedSowDate, plannedTransplantDate } = body;

    const isPlanned = mode === 'planned';

    if (!bedId || !rawPlantName) {
      return NextResponse.json({ error: 'bedId and plantName are required' }, { status: 400 });
    }

    // Auto-capitalise plant name (e.g. "blueberries" → "Blueberries")
    const plantName = rawPlantName.replace(/\b\w/g, (c: string) => c.toUpperCase());

    if (!isPlanned && !datePlanted) {
      return NextResponse.json({ error: 'datePlanted is required for active plantings' }, { status: 400 });
    }

    // Auto-calculate harvest dates from CSV plant database
    let expectedHarvestStart = null;
    let expectedHarvestEnd = null;

    try {
      if (isPlanned) {
        const { calculatePlannedTimeline } = await import('@/lib/plants/database');
        const timeline = calculatePlannedTimeline(plantName);
        if (timeline) {
          expectedHarvestStart = timeline.expectedHarvestStart;
          expectedHarvestEnd = timeline.expectedHarvestEnd;
        }
      } else {
        const { getPlantByName } = await import('@/lib/plants/database');
        const plantInfo = getPlantByName(plantName);
        if (plantInfo) {
          let days: number | null = null;
          let fromDate: string | null = null;

          if (dateSown && plantInfo.daysToHarvestFromSowing) {
            days = plantInfo.daysToHarvestFromSowing;
            fromDate = dateSown;
          } else if (plantInfo.daysToHarvestFromTransplant) {
            days = plantInfo.daysToHarvestFromTransplant;
            fromDate = datePlanted;
          } else if (plantInfo.daysToHarvestFromSowing) {
            days = plantInfo.daysToHarvestFromSowing;
            fromDate = datePlanted;
          }

          if (days && fromDate) {
            const base = new Date(fromDate);
            const harvestStart = new Date(base);
            harvestStart.setDate(harvestStart.getDate() + days);
            expectedHarvestStart = harvestStart.toISOString().split('T')[0];

            const windowDays = plantInfo.harvestWindowDays || 30;
            const harvestEnd = new Date(harvestStart);
            harvestEnd.setDate(harvestEnd.getDate() + windowDays);
            expectedHarvestEnd = harvestEnd.toISOString().split('T')[0];
          }
        }
      }
    } catch {
      // Plant database not available, skip auto-calculation
    }

    const result = await db.insert(plantings).values({
      bedId,
      plantName,
      variety: variety || null,
      datePlanted: isPlanned ? null : datePlanted,
      dateSown: dateSown || null,
      expectedHarvestStart,
      expectedHarvestEnd,
      bedFraction: bedFraction || 'full',
      status: isPlanned ? 'planned' : 'growing',
      notes: notes || null,
      plannedSowDate: isPlanned ? (plannedSowDate || null) : null,
      plannedTransplantDate: isPlanned ? (plannedTransplantDate || null) : null,
    }).returning();

    const newPlanting = result[0];

    // Auto-create tasks for planned plantings
    if (isPlanned && newPlanting) {
      const tasksToCreate: Array<{
        plantingId: number; title: string; description: string;
        dueDate: string; category: string; priority: string; isAiGenerated: boolean;
      }> = [];

      if (plannedSowDate) {
        tasksToCreate.push({
          plantingId: newPlanting.id,
          title: `Sow ${plantName} indoors (bed ${bedId})`,
          description: `Start seeds indoors for planned planting in bed ${bedId}`,
          dueDate: plannedSowDate,
          category: 'sowing',
          priority: 'medium',
          isAiGenerated: true,
        });
      }

      if (plannedTransplantDate) {
        tasksToCreate.push({
          plantingId: newPlanting.id,
          title: `Plant out ${plantName} in bed ${bedId}`,
          description: `Transplant seedlings into bed ${bedId}`,
          dueDate: plannedTransplantDate,
          category: 'sowing',
          priority: 'high',
          isAiGenerated: true,
        });
      }

      if (tasksToCreate.length > 0) {
        await db.insert(tasks).values(tasksToCreate);
      }
    }

    // Auto-create feeding task for active (non-planned) plantings
    if (!isPlanned && newPlanting) {
      try {
        const { getFeedingInfo } = await import('@/lib/plants/database');
        const feeding = getFeedingInfo(plantName);
        if (feeding) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + feeding.intervalDays);
          await db.insert(tasks).values({
            plantingId: newPlanting.id,
            title: `Feed ${plantName} in ${bedId} (${feeding.type})`,
            category: 'feeding',
            priority: 'medium',
            dueDate: dueDate.toISOString().split('T')[0],
            isAiGenerated: true,
          });
        }
      } catch { /* skip if plant db unavailable */ }
    }

    return NextResponse.json(newPlanting, { status: 201 });
  } catch (error) {
    console.error('Failed to create planting:', error);
    return NextResponse.json({ error: 'Failed to create planting' }, { status: 500 });
  }
}
