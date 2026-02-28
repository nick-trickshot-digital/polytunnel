import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { beds, plantings, cropHistory, harvests } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAdjacentBeds } from '@/lib/utils/companions';
import { checkRotation, getPlantFamily } from '@/lib/utils/rotation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const checkCompanions = request.nextUrl.searchParams.get('checkCompanions');
    const checkRotationParam = request.nextUrl.searchParams.get('checkRotation');

    const bed = await db.select().from(beds).where(eq(beds.id, id));
    if (bed.length === 0) {
      return NextResponse.json({ error: 'Bed not found' }, { status: 404 });
    }

    const bedPlantings = await db.select().from(plantings).where(eq(plantings.bedId, id));
    const bedHistory = await db.select().from(cropHistory).where(eq(cropHistory.bedId, id));

    // Get harvest data for each planting
    const plantingIds = bedPlantings.map(p => p.id);
    const allHarvests = plantingIds.length > 0
      ? await db.select().from(harvests)
      : [];
    const bedHarvests = allHarvests.filter(h => plantingIds.includes(h.plantingId));

    const result: Record<string, unknown> = {
      ...bed[0],
      plantings: bedPlantings,
      cropHistory: bedHistory,
      harvests: bedHarvests,
    };

    // Companion planting check
    if (checkCompanions) {
      const adjacentBedIds = getAdjacentBeds(id);
      const adjacentPlantings = await db.select().from(plantings);
      const nearbyPlants = adjacentPlantings
        .filter(p => adjacentBedIds.includes(p.bedId) && p.status !== 'finished' && p.status !== 'failed')
        .map(p => p.plantName);

      // Simple companion check using plant database
      const { plantDatabase } = await import('@/lib/plants/database');
      const plant = plantDatabase.find(
        p => p.name.toLowerCase() === checkCompanions.toLowerCase()
      );

      if (plant) {
        const good = nearbyPlants.filter(np =>
          plant.companions.some(c => c.toLowerCase() === np.toLowerCase())
        );
        const bad = nearbyPlants.filter(np =>
          plant.avoid.some(a => a.toLowerCase() === np.toLowerCase())
        );
        result.companions = { good: [...new Set(good)], bad: [...new Set(bad)] };
      }
    }

    // Rotation warnings for current active plantings
    const rotationHistory = bedHistory.map(h => ({ year: h.year, plantFamily: h.plantFamily }));
    const activeForRotation = bedPlantings.filter(p => p.status !== 'finished' && p.status !== 'failed');
    const checkedFamilies = new Set<string>();
    const rotationWarnings: Array<{ bedId: string; family: string; consecutiveYears: number; message: string }> = [];

    for (const p of activeForRotation) {
      const family = getPlantFamily(p.plantName);
      if (!checkedFamilies.has(family)) {
        checkedFamilies.add(family);
        const warning = checkRotation(id, family, rotationHistory);
        if (warning) rotationWarnings.push(warning);
      }
    }
    result.rotationWarnings = rotationWarnings;

    // Rotation check for a specific plant (used when adding/planning)
    if (checkRotationParam) {
      const family = getPlantFamily(checkRotationParam);
      const warning = checkRotation(id, family, rotationHistory);
      result.rotationCheck = warning;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch bed:', error);
    return NextResponse.json({ error: 'Failed to fetch bed' }, { status: 500 });
  }
}
