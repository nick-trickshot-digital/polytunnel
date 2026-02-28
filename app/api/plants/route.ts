import { NextResponse } from 'next/server';
import { getPlantDatabase } from '@/lib/plants/database';

export async function GET() {
  try {
    const plants = getPlantDatabase();
    return NextResponse.json(
      plants.map(p => ({ name: p.name, icon: p.icon, family: p.family, type: p.type }))
    );
  } catch (error) {
    console.error('Failed to load plant database:', error);
    return NextResponse.json([], { status: 500 });
  }
}
