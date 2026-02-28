import { db } from '@/lib/db';
import { beds, plantings, cropHistory, tasks, harvests } from '@/lib/db/schema';
import { eq, asc, desc } from 'drizzle-orm';
import { getWeatherData } from '@/lib/weather/client';
import { fractionToNumber } from '@/lib/utils/companions';
import { daysSince } from '@/lib/utils/dates';

// Simple in-memory cache — context doesn't change quickly
let cachedContext: string | null = null;
let contextCacheTime = 0;
const CONTEXT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function buildTunnelContext(): Promise<string> {
  if (cachedContext && Date.now() - contextCacheTime < CONTEXT_CACHE_DURATION) {
    return cachedContext;
  }
  const today = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Fetch all data in parallel
  const [allBeds, allPlantings, allHistory, pendingTasks, weather, recentHarvests, completedTasks] = await Promise.all([
    db.select().from(beds),
    db.select().from(plantings),
    db.select().from(cropHistory),
    db.select().from(tasks).where(eq(tasks.isCompleted, false)).orderBy(asc(tasks.dueDate)),
    getWeatherData().catch(() => null),
    db.select().from(harvests).orderBy(desc(harvests.dateHarvested)).limit(20),
    db.select().from(tasks).where(eq(tasks.isCompleted, true)).orderBy(desc(tasks.completedAt)).limit(5),
  ]);

  const growingPlantings = allPlantings.filter(p => p.status !== 'finished' && p.status !== 'failed' && p.status !== 'planned');
  const plannedPlantings = allPlantings.filter(p => p.status === 'planned');
  const failedPlantings = allPlantings.filter(p => p.status === 'failed');

  // Build tunnel state — growing plantings
  const bedSummaries = allBeds.map(bed => {
    const bedPlantings = growingPlantings.filter(p => p.bedId === bed.id);
    const bedPlanned = plannedPlantings.filter(p => p.bedId === bed.id);
    const totalUsed = [...bedPlantings, ...bedPlanned].reduce((sum, p) => sum + fractionToNumber(p.bedFraction), 0);

    if (bedPlantings.length === 0 && bedPlanned.length === 0) {
      return `  ${bed.id}: EMPTY (${bed.widthMm}mm × ${bed.lengthMm}mm)`;
    }

    const plantInfo = bedPlantings.map(p => {
      const days = p.datePlanted ? daysSince(p.datePlanted) : 0;
      let info = `${p.plantName}${p.variety ? ` (${p.variety})` : ''} — ${p.bedFraction} bed, ${days} days old, status: ${p.status}`;
      if (p.notes) info += ` [Notes: ${p.notes}]`;
      return info;
    }).join('; ');

    const plannedInfo = bedPlanned.map(p => {
      let info = `${p.plantName}${p.variety ? ` (${p.variety})` : ''} — ${p.bedFraction} bed, PLANNED`;
      if (p.plannedSowDate) info += `, sow by: ${p.plannedSowDate}`;
      if (p.plannedTransplantDate) info += `, plant out by: ${p.plannedTransplantDate}`;
      return info;
    }).join('; ');

    const allInfo = [plantInfo, plannedInfo].filter(Boolean).join('; ');
    return `  ${bed.id}: ${allInfo} (${Math.round(totalUsed * 100)}% full)`;
  });

  const emptyBeds = allBeds.filter(bed => {
    const all = [...growingPlantings, ...plannedPlantings].filter(p => p.bedId === bed.id);
    const totalUsed = all.reduce((sum, p) => sum + fractionToNumber(p.bedFraction), 0);
    return totalUsed < 1;
  }).map(bed => {
    const all = [...growingPlantings, ...plannedPlantings].filter(p => p.bedId === bed.id);
    const totalUsed = all.reduce((sum, p) => sum + fractionToNumber(p.bedFraction), 0);
    const remaining = Math.round((1 - totalUsed) * 100);
    return `  ${bed.id}: ${remaining}% free (${bed.column} column, ${bed.widthMm}mm wide)`;
  });

  // Planned future plantings
  const plannedInfo = plannedPlantings.map(p => {
    let info = `  ${p.bedId}: ${p.plantName}${p.variety ? ` (${p.variety})` : ''} — ${p.bedFraction} bed`;
    if (p.plannedSowDate) info += `, sow by: ${p.plannedSowDate}`;
    if (p.plannedTransplantDate) info += `, plant out by: ${p.plannedTransplantDate}`;
    if (p.expectedHarvestStart) info += `, expected harvest: ${p.expectedHarvestStart}`;
    return info;
  }).join('\n');

  // Recent harvest log
  const harvestInfo = recentHarvests.map(h => {
    const planting = allPlantings.find(p => p.id === h.plantingId);
    const plantName = planting?.plantName || 'Unknown';
    const bedId = planting?.bedId || '?';
    return `  ${h.dateHarvested}: ${plantName} from bed ${bedId}${h.quantity ? ` — ${h.quantity}` : ''}${h.notes ? ` (${h.notes})` : ''}`;
  }).join('\n');

  // Failed plantings with notes
  const failedInfo = failedPlantings
    .map(p => `  ${p.bedId}: ${p.plantName} — failed${p.notes ? ` (${p.notes})` : ''}`)
    .join('\n');

  // Recent rotation history with success ratings
  const currentYear = today.getFullYear();
  const recentHistory = allHistory
    .filter(h => h.year >= currentYear - 2)
    .map(h => {
      let line = `  ${h.bedId}: ${h.plantName} (${h.plantFamily || 'Unknown family'}) — ${h.year} ${h.season || ''}`;
      if (h.successRating !== null) line += ` [Rating: ${h.successRating}/5]`;
      if (h.notes) line += ` [${h.notes}]`;
      return line;
    })
    .join('\n');

  // Upcoming tasks
  const upcomingTasks = pendingTasks.slice(0, 15).map(t =>
    `  - [${t.priority}] ${t.title}${t.dueDate ? ` (due: ${t.dueDate})` : ''} [${t.category}]`
  ).join('\n');

  // Recently completed tasks
  const recentCompleted = completedTasks.map(t =>
    `  - ${t.title}${t.completedAt ? ` (completed: ${new Date(t.completedAt).toLocaleDateString('en-GB')})` : ''}`
  ).join('\n');

  // Weather context (outdoor — tunnel will be warmer/sheltered)
  let weatherContext = 'Weather data unavailable';
  if (weather) {
    weatherContext = `OUTDOOR Temperature: ${Math.round(weather.current.temp)}°C (feels like ${Math.round(weather.current.feelsLike)}°C) — tunnel interior will be warmer
  Conditions: ${weather.current.description}
  Humidity: ${weather.current.humidity}%
  Wind: ${Math.round(weather.current.windSpeed)} km/h (tunnel sheltered from wind)`;

    if (weather.forecast.length > 0) {
      weatherContext += '\n\n  Outdoor forecast (tunnel will be warmer):';
      for (const day of weather.forecast.slice(0, 5)) {
        weatherContext += `\n  ${day.dayName}: ${Math.round(day.tempMin)}–${Math.round(day.tempMax)}°C outdoors, ${day.description}, ${day.pop}% rain chance`;
      }
    }

    if (weather.alerts.length > 0) {
      weatherContext += '\n\n  ACTIVE ALERTS:';
      for (const alert of weather.alerts) {
        weatherContext += `\n  ${alert.icon} ${alert.message}`;
      }
    }
  }

  const result = `Current date: ${today.toLocaleDateString('en-GB')}
Current month: ${monthNames[today.getMonth()]}
Season: ${getSeasonName(today.getMonth() + 1)}

CURRENT TUNNEL STATE:
${bedSummaries.join('\n')}

EMPTY/AVAILABLE BEDS:
${emptyBeds.length > 0 ? emptyBeds.join('\n') : '  All beds fully planted'}

PLANNED FUTURE PLANTINGS:
${plannedInfo || '  No future plantings planned'}

RECENT HARVEST LOG (last 20):
${harvestInfo || '  No harvests recorded yet'}

CURRENT WEATHER (outdoor readings — all plants are inside the polytunnel):
  ${weatherContext}

RECENT CROP HISTORY (last 2 years):
${recentHistory || '  No rotation history recorded yet'}

FAILED PLANTINGS:
${failedInfo || '  None'}

UPCOMING TASKS:
${upcomingTasks || '  No pending tasks'}

RECENTLY COMPLETED TASKS:
${recentCompleted || '  None recently completed'}

NOTE: Each bed has separate soil — conditions and amendments may vary between beds.`;

  cachedContext = result;
  contextCacheTime = Date.now();
  return result;
}

function getSeasonName(month: number): string {
  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Autumn';
  return 'Winter';
}
