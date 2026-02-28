import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cropHistory } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bedId: string }> }
) {
  try {
    const { bedId } = await params;
    const history = await db.select().from(cropHistory)
      .where(eq(cropHistory.bedId, bedId))
      .orderBy(desc(cropHistory.year));

    return NextResponse.json(history);
  } catch (error) {
    console.error('Failed to fetch bed rotation:', error);
    return NextResponse.json({ error: 'Failed to fetch bed rotation' }, { status: 500 });
  }
}
