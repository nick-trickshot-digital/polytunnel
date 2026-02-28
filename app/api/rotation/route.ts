import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cropHistory, beds } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const allBeds = await db.select().from(beds);
    const allHistory = await db.select().from(cropHistory).orderBy(desc(cropHistory.year));

    const rotationMap = allBeds.map(bed => ({
      bedId: bed.id,
      column: bed.column,
      position: bed.position,
      history: allHistory.filter(h => h.bedId === bed.id),
    }));

    return NextResponse.json(rotationMap);
  } catch (error) {
    console.error('Failed to fetch rotation data:', error);
    return NextResponse.json({ error: 'Failed to fetch rotation data' }, { status: 500 });
  }
}
