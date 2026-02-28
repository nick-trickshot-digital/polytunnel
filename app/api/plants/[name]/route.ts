import { NextResponse } from 'next/server';
import { getPlantByName } from '@/lib/plants/database';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);
    const plant = getPlantByName(decodedName);

    if (!plant) {
      return NextResponse.json({ error: 'Plant not found' }, { status: 404 });
    }

    return NextResponse.json({
      name: plant.name,
      family: plant.family,
      type: plant.type,
      icon: plant.icon,
      spacingCm: plant.spacingCm,
      minTempC: plant.minTempC,
      feedingType: plant.feedingType,
      feedingFrequency: plant.feedingFrequency,
      daysToHarvest: plant.daysToHarvest,
      daysToHarvestFromSowing: plant.daysToHarvestFromSowing,
      daysToHarvestFromTransplant: plant.daysToHarvestFromTransplant,
      harvestWindowDays: plant.harvestWindowDays,
      companions: plant.companions,
      avoid: plant.avoid,
      sowIndoorMonths: plant.sowIndoorMonths,
      directSowMonths: plant.directSowMonths,
      transplantMonths: plant.transplantMonths,
      harvestMonths: plant.harvestMonths,
    });
  } catch (error) {
    console.error('Plant detail error:', error);
    return NextResponse.json({ error: 'Failed to load plant' }, { status: 500 });
  }
}
