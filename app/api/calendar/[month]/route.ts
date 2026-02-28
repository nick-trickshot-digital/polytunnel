import { NextRequest, NextResponse } from 'next/server';
import { getPlantDatabase } from '@/lib/plants/database';
import { db } from '@/lib/db';
import { plantings } from '@/lib/db/schema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ month: string }> }
) {
  try {
    const { month: monthStr } = await params;
    const month = parseInt(monthStr);

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid month (1-12)' }, { status: 400 });
    }

    const plantDatabase = getPlantDatabase();
    const sowIndoors = plantDatabase.filter(p => p.sowIndoorMonths.includes(month));
    const transplant = plantDatabase.filter(p => p.transplantMonths.includes(month));
    const harvest = plantDatabase.filter(p => p.harvestMonths.includes(month));

    // Query actual plantings with expected harvests in the selected month
    const allPlantings = await db.select().from(plantings);
    const yourPlantings = allPlantings
      .filter(p => {
        if (p.status === 'finished' || p.status === 'failed') return false;
        if (!p.expectedHarvestStart) return false;
        const harvestDate = new Date(p.expectedHarvestStart + 'T12:00:00');
        const harvestMonth = harvestDate.getMonth() + 1;
        // Also check expectedHarvestEnd for range
        if (p.expectedHarvestEnd) {
          const endDate = new Date(p.expectedHarvestEnd + 'T12:00:00');
          const endMonth = endDate.getMonth() + 1;
          const startYear = harvestDate.getFullYear();
          const endYear = endDate.getFullYear();
          // Check if selected month falls within the harvest range
          for (let y = startYear; y <= endYear; y++) {
            const startM = y === startYear ? harvestMonth : 1;
            const endM = y === endYear ? endMonth : 12;
            if (month >= startM && month <= endM) return true;
          }
          return false;
        }
        return harvestMonth === month;
      })
      .map(p => ({
        id: p.id,
        plantName: p.plantName,
        variety: p.variety,
        bedId: p.bedId,
        expectedHarvestStart: p.expectedHarvestStart,
        expectedHarvestEnd: p.expectedHarvestEnd,
        status: p.status,
      }))
      .sort((a, b) => (a.expectedHarvestStart || '').localeCompare(b.expectedHarvestStart || ''));

    // Plantings planted or sown in the selected month
    const plantedThisMonth = allPlantings
      .filter(p => {
        // Check datePlanted
        if (p.datePlanted) {
          const planted = new Date(p.datePlanted + 'T12:00:00');
          if (planted.getMonth() + 1 === month) return true;
        }
        // Check dateSown
        if (p.dateSown) {
          const sown = new Date(p.dateSown + 'T12:00:00');
          if (sown.getMonth() + 1 === month) return true;
        }
        return false;
      })
      .map(p => ({
        id: p.id,
        plantName: p.plantName,
        variety: p.variety,
        bedId: p.bedId,
        datePlanted: p.datePlanted,
        dateSown: p.dateSown,
        status: p.status,
      }))
      .sort((a, b) => (a.datePlanted || '').localeCompare(b.datePlanted || ''));

    // Monthly tips for Surrey polytunnel
    const monthlyTips: Record<number, string[]> = {
      1: ['Order seeds for the year', 'Clean tunnel glass/plastic', 'Plan crop rotation', 'Force rhubarb', 'Check stored crops'],
      2: ['Start early sowings indoors', 'Prepare beds with compost', 'Check for overwintering pests', 'Begin chitting seed potatoes'],
      3: ['Start succession sowing lettuce', 'Sow tomatoes and peppers indoors', 'Prepare runner bean supports', 'Top-dress beds with compost'],
      4: ['Harden off seedlings', 'Plant out hardy crops', 'Start feeding overwintered crops', 'Watch for late frosts', 'Install irrigation if needed'],
      5: ['Plant out tender crops after last frost', 'Pinch out tomato side shoots', 'Start liquid feeding', 'Succession sow salads', 'Watch for aphids'],
      6: ['Ventilate daily in warm weather', 'Water consistently', 'Feed tomatoes weekly', 'Train cucumbers', 'Harvest early crops'],
      7: ['Peak growing season — water daily', 'Feed heavily', 'Harvest regularly', 'Sow autumn/winter crops', 'Check for blight'],
      8: ['Continue harvesting', 'Sow winter salads', 'Start reducing watering for some crops', 'Take basil cuttings', 'Plan autumn planting'],
      9: ['Clear spent crops', 'Sow overwintering onions and garlic', 'Plant autumn salads', 'Reduce ventilation as nights cool', 'Green manure empty beds'],
      10: ['Close tunnel at night', 'Fleece tender crops', 'Clear and compost spent plants', 'Plant garlic', 'Reduce watering'],
      11: ['Minimal watering needed', 'Protect with fleece', 'Clean and maintain tunnel', 'Plan next year', 'Order seed catalogues'],
      12: ['Rest month — minimal work needed', 'Check ventilation on mild days', 'Force chicory', 'Review the year', 'Clean tools'],
    };

    // Planned plantings with activity this month
    const plannedThisMonth = allPlantings
      .filter(p => p.status === 'planned')
      .filter(p => {
        if (p.plannedSowDate) {
          const d = new Date(p.plannedSowDate + 'T12:00:00');
          if (d.getMonth() + 1 === month) return true;
        }
        if (p.plannedTransplantDate) {
          const d = new Date(p.plannedTransplantDate + 'T12:00:00');
          if (d.getMonth() + 1 === month) return true;
        }
        if (p.expectedHarvestStart) {
          const d = new Date(p.expectedHarvestStart + 'T12:00:00');
          if (d.getMonth() + 1 === month) return true;
        }
        return false;
      })
      .map(p => ({
        id: p.id,
        plantName: p.plantName,
        variety: p.variety,
        bedId: p.bedId,
        plannedSowDate: p.plannedSowDate,
        plannedTransplantDate: p.plannedTransplantDate,
        expectedHarvestStart: p.expectedHarvestStart,
      }));

    return NextResponse.json({
      month,
      sowIndoors: sowIndoors.map(p => ({ name: p.name, icon: p.icon })),
      transplant: transplant.map(p => ({ name: p.name, icon: p.icon })),
      harvest: harvest.map(p => ({ name: p.name, icon: p.icon })),
      yourPlantings,
      plantedThisMonth,
      plannedPlantings: plannedThisMonth,
      tips: monthlyTips[month] || [],
    });
  } catch (error) {
    console.error('Failed to fetch calendar data:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar data' }, { status: 500 });
  }
}
