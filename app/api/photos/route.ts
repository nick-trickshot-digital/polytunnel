import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { photos } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bedId, plantingId, imageUrl, caption } = body;

    if (!bedId || !imageUrl) {
      return NextResponse.json({ error: 'bedId and imageUrl are required' }, { status: 400 });
    }

    const result = await db.insert(photos).values({
      bedId,
      plantingId: plantingId || null,
      imageUrl,
      caption: caption || null,
    }).returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Failed to upload photo:', error);
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
  }
}
