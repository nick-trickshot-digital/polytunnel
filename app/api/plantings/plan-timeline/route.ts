import { NextRequest, NextResponse } from 'next/server';
import { calculatePlannedTimeline } from '@/lib/plants/database';

export async function GET(request: NextRequest) {
  const plantName = request.nextUrl.searchParams.get('plant');
  if (!plantName) {
    return NextResponse.json({ error: 'plant parameter required' }, { status: 400 });
  }

  const timeline = calculatePlannedTimeline(plantName);
  if (!timeline) {
    return NextResponse.json({ error: 'Plant not found in database' }, { status: 404 });
  }

  return NextResponse.json(timeline);
}
