import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { beds, plantings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allBeds = await db.select().from(beds);
    const allPlantings = await db.select().from(plantings);

    const bedsWithPlantings = allBeds.map(bed => ({
      ...bed,
      plantings: allPlantings.filter(p => p.bedId === bed.id),
    }));

    return NextResponse.json(bedsWithPlantings);
  } catch (error) {
    console.error('Failed to fetch beds:', error);
    return NextResponse.json({ error: 'Failed to fetch beds' }, { status: 500 });
  }
}
