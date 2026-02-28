import { NextResponse } from 'next/server';
import { getPlantDatabase } from '@/lib/plants/database';
import { db } from '@/lib/db';
import { beds, plantings } from '@/lib/db/schema';
import { fractionToNumber } from '@/lib/utils/companions';

export async function GET() {
  try {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const allPlants = getPlantDatabase();

    // Get current tunnel state
    const [allBeds, allPlantings] = await Promise.all([
      db.select().from(beds),
      db.select().from(plantings),
    ]);

    const activePlantings = allPlantings.filter(
      p => p.status !== 'finished' && p.status !== 'failed'
    );

    // Plants already growing
    const alreadyGrowing = new Set(
      activePlantings.map(p => p.plantName.toLowerCase())
    );

    // Find plants appropriate for this month (sow indoors, direct sow, or transplant)
    const suggestions = allPlants
      .filter(plant => {
        // Must have some action available this month
        const canSowIndoors = plant.sowIndoorMonths.includes(currentMonth);
        const canDirectSow = plant.directSowMonths.includes(currentMonth);
        const canTransplant = plant.transplantMonths.includes(currentMonth);
        return canSowIndoors || canDirectSow || canTransplant;
      })
      .filter(plant => !alreadyGrowing.has(plant.name.toLowerCase()))
      .map(plant => {
        const canSowIndoors = plant.sowIndoorMonths.includes(currentMonth);
        const canDirectSow = plant.directSowMonths.includes(currentMonth);
        const canTransplant = plant.transplantMonths.includes(currentMonth);

        // Determine best action for this month
        let actionLabel: string;
        if (canTransplant) {
          actionLabel = 'Plant out now';
        } else if (canDirectSow) {
          actionLabel = 'Direct sow';
        } else {
          actionLabel = 'Sow indoors';
        }

        return {
          name: plant.name,
          icon: plant.icon,
          family: plant.family,
          actionLabel,
          daysToHarvest: plant.daysToHarvest,
          canSowIndoors,
          canDirectSow,
          canTransplant,
        };
      })
      // Sort: transplant-ready first, then direct sow, then indoor sow
      .sort((a, b) => {
        const aPriority = a.canTransplant ? 0 : a.canDirectSow ? 1 : 2;
        const bPriority = b.canTransplant ? 0 : b.canDirectSow ? 1 : 2;
        return aPriority - bPriority;
      });

    // Available beds with remaining space
    const availableBeds = allBeds
      .map(bed => {
        const bedPlantings = activePlantings.filter(p => p.bedId === bed.id);
        const used = bedPlantings.reduce(
          (sum, p) => sum + fractionToNumber(p.bedFraction),
          0
        );
        const remaining = Math.max(0, 1 - used);
        return {
          id: bed.id,
          column: bed.column,
          remaining,
          widthMm: bed.widthMm,
        };
      })
      .filter(b => b.remaining > 0)
      .sort((a, b) => {
        // Fully empty beds first, then by remaining space
        if (b.remaining !== a.remaining) return b.remaining - a.remaining;
        return a.id.localeCompare(b.id);
      });

    return NextResponse.json({
      month: currentMonth,
      suggestions,
      availableBeds,
    });
  } catch (error) {
    console.error('Seasonal suggestions error:', error);
    return NextResponse.json({ month: 0, suggestions: [], availableBeds: [] });
  }
}
