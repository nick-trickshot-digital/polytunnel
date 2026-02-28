import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { harvests, plantings } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const allHarvests = await db.select().from(harvests).orderBy(desc(harvests.dateHarvested));
    const allPlantings = await db.select().from(plantings);

    // Enrich harvests with plant name and bed ID
    const enriched = allHarvests.map(h => {
      const planting = allPlantings.find(p => p.id === h.plantingId);
      return {
        ...h,
        plantName: planting?.plantName || null,
        bedId: planting?.bedId || null,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Failed to fetch harvests:', error);
    return NextResponse.json({ error: 'Failed to fetch harvests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plantingId, dateHarvested, quantity, notes } = body;

    if (!plantingId || !dateHarvested) {
      return NextResponse.json({ error: 'plantingId and dateHarvested are required' }, { status: 400 });
    }

    const result = await db.insert(harvests).values({
      plantingId,
      dateHarvested,
      quantity: quantity || null,
      notes: notes || null,
    }).returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Failed to log harvest:', error);
    return NextResponse.json({ error: 'Failed to log harvest' }, { status: 500 });
  }
}
