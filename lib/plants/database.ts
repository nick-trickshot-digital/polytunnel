import fs from 'fs';
import path from 'path';

export interface PlantInfo {
  name: string;
  family: string;
  type: 'annual' | 'perennial' | 'biennial';
  icon: string;
  sowIndoorsStart: number | null;
  sowIndoorsEnd: number | null;
  directSowStart: number | null;
  directSowEnd: number | null;
  transplantStart: number | null;
  transplantEnd: number | null;
  daysToHarvestFromSowing: number | null;
  daysToHarvestFromTransplant: number | null;
  harvestWindowDays: number | null;
  spacingCm: number | null;
  minTempC: number | null;
  feedingType: string;
  feedingFrequency: string;
  companions: string[];
  avoid: string[];

  // Computed for backward compatibility
  sowIndoorMonths: number[];
  directSowMonths: number[];
  transplantMonths: number[];
  harvestMonths: number[];
  /** Best available days-to-harvest (prefers transplant, falls back to sowing) */
  daysToHarvest: number;
}

// Icon lookup — CSV doesn't store these so we map them here
const plantIcons: Record<string, string> = {
  'Tomatoes': '🍅', 'Cucumbers': '🥒', 'Peppers (Sweet)': '🫑',
  'Chillies': '🌶️', 'Aubergines': '🍆', 'Lettuce': '🥬',
  'Basil': '🌿', 'French Beans': '🫘', 'Runner Beans': '🫘',
  'Courgettes': '🥒', 'Strawberries': '🍓', 'Radishes': '🔴',
  'Spinach': '🥬', 'Spring Onions': '🧅', 'Carrots': '🥕',
  'Beetroot': '🟣', 'Kale': '🥬', 'Chard': '🥬',
  'Pak Choi': '🥬', 'Rocket': '🌿', 'Coriander': '🌿',
  'Parsley': '🌿', 'Dill': '🌿', 'Melon': '🍈',
  'Grapes': '🍇', 'Figs': '🫒', 'Sweetcorn': '🌽',
  'Squash (Winter)': '🎃', 'Peas': '🟢', 'Broad Beans': '🫛',
  'Florence Fennel': '🌿', 'Celery': '🥬', 'Celeriac': '🥬',
  'Sweet Potatoes': '🍠', 'Microgreens': '🌱', 'Garlic': '🧄',
  'Onions (Overwintering Sets)': '🧅', 'Mint': '🌿', 'Chives': '🌿',
  'Thyme': '🌿', 'Oregano': '🌿', 'Sorrel': '🌿',
  'Nasturtiums': '🌸', 'Marigolds': '🌼', 'Turnips': '🟣',
  'Kohlrabi': '🟢', 'Leeks': '🧅', 'Potatoes (Early)': '🥔',
  'Mangetout': '🟢', 'Calabrese/Broccoli': '🥦', 'Spring Cabbage': '🥬',
  'Mizuna': '🥬', 'Mustard Greens': '🥬', 'Land Cress': '🌿',
  'Endive': '🥬', 'Perpetual Spinach': '🥬', 'Okra': '🟢',
  'Raspberries': '🫐', 'Rosemary': '🌿', 'Sage': '🌿',
  'Lemon Balm': '🌿', 'Tarragon (French)': '🌿', 'Chervil': '🌿',
  'Borage': '🌸', 'Sunflowers': '🌻', 'Peaches': '🍑',
  'Pumpkins': '🎃', 'Watercress': '🌿',
};

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseNumber(val: string): number | null {
  if (!val || val === '') return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function parseSemicolonList(val: string): string[] {
  if (!val || val === '') return [];
  return val.split(';').map(s => s.trim()).filter(Boolean);
}

/** Generate month range array from start to end month (1-12), wrapping around year if needed */
function monthRange(start: number | null, end: number | null): number[] {
  if (start === null || end === null) return [];
  const months: number[] = [];
  let m = start;
  while (true) {
    months.push(m);
    if (m === end) break;
    m = m === 12 ? 1 : m + 1;
  }
  return months;
}

/** Estimate harvest months from sowing/transplant timing + days to harvest */
function estimateHarvestMonths(plant: {
  sowIndoorsStart: number | null;
  directSowStart: number | null;
  transplantStart: number | null;
  daysToHarvestFromSowing: number | null;
  daysToHarvestFromTransplant: number | null;
  harvestWindowDays: number | null;
}): number[] {
  // Work out earliest planting month and days to harvest
  let startMonth: number | null = null;
  let days: number | null = null;

  if (plant.transplantStart && plant.daysToHarvestFromTransplant) {
    startMonth = plant.transplantStart;
    days = plant.daysToHarvestFromTransplant;
  } else if (plant.directSowStart && plant.daysToHarvestFromSowing) {
    startMonth = plant.directSowStart;
    days = plant.daysToHarvestFromSowing;
  } else if (plant.sowIndoorsStart && plant.daysToHarvestFromSowing) {
    startMonth = plant.sowIndoorsStart;
    days = plant.daysToHarvestFromSowing;
  }

  if (!startMonth || !days) return [];

  // Rough: each month ≈ 30 days
  const harvestStartMonth = ((startMonth - 1 + Math.floor(days / 30)) % 12) + 1;
  const windowMonths = Math.max(1, Math.ceil((plant.harvestWindowDays || 30) / 30));
  const endMonth = ((harvestStartMonth - 1 + windowMonths - 1) % 12) + 1;

  return monthRange(harvestStartMonth, endMonth);
}

function loadFromCSV(): PlantInfo[] {
  const csvPath = path.join(process.cwd(), 'lib', 'plants', 'plant-database.csv');
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());

  // Skip header
  const dataLines = lines.slice(1);

  return dataLines.map(line => {
    const f = parseCSVLine(line);
    // CSV columns: name,family,type,sowIndoorsStart,sowIndoorsEnd,directSowStart,directSowEnd,
    // transplantStart,transplantEnd,daysToHarvestFromSowing,daysToHarvestFromTransplant,
    // harvestWindowDays,spacingCm,minTempC,feedingType,feedingFrequency,companions,avoid

    const sowIndoorsStart = parseNumber(f[3]);
    const sowIndoorsEnd = parseNumber(f[4]);
    const directSowStart = parseNumber(f[5]);
    const directSowEnd = parseNumber(f[6]);
    const transplantStart = parseNumber(f[7]);
    const transplantEnd = parseNumber(f[8]);
    const daysToHarvestFromSowing = parseNumber(f[9]);
    const daysToHarvestFromTransplant = parseNumber(f[10]);
    const harvestWindowDays = parseNumber(f[11]);

    const plant: Omit<PlantInfo, 'sowIndoorMonths' | 'directSowMonths' | 'transplantMonths' | 'harvestMonths' | 'daysToHarvest'> = {
      name: f[0],
      family: f[1],
      type: (f[2] as PlantInfo['type']) || 'annual',
      icon: plantIcons[f[0]] || '🌱',
      sowIndoorsStart,
      sowIndoorsEnd,
      directSowStart,
      directSowEnd,
      transplantStart,
      transplantEnd,
      daysToHarvestFromSowing,
      daysToHarvestFromTransplant,
      harvestWindowDays,
      spacingCm: parseNumber(f[12]),
      minTempC: parseNumber(f[13]),
      feedingType: f[14] || 'none',
      feedingFrequency: f[15] || 'none',
      companions: parseSemicolonList(f[16]),
      avoid: parseSemicolonList(f[17]),
    };

    // Computed backward-compatible fields
    const sowIndoorMonths = monthRange(sowIndoorsStart, sowIndoorsEnd);
    const directSowMonths = monthRange(directSowStart, directSowEnd);
    const transplantMonths = monthRange(transplantStart, transplantEnd);
    const harvestMonths = estimateHarvestMonths(plant);
    const daysToHarvest = daysToHarvestFromTransplant || daysToHarvestFromSowing || 0;

    return { ...plant, sowIndoorMonths, directSowMonths, transplantMonths, harvestMonths, daysToHarvest };
  });
}

// Cache parsed data — CSV is read once per server start
let _cache: PlantInfo[] | null = null;

export function getPlantDatabase(): PlantInfo[] {
  if (!_cache) {
    _cache = loadFromCSV();
  }
  return _cache;
}

/** Backward-compatible export */
export const plantDatabase: PlantInfo[] = (() => {
  try {
    return getPlantDatabase();
  } catch {
    // During build or if CSV not available, return empty
    return [];
  }
})();

export function getPlantByName(name: string): PlantInfo | undefined {
  return getPlantDatabase().find(p => p.name.toLowerCase() === name.toLowerCase());
}

export function getFeedingInfo(plantName: string): { type: string; frequency: string; intervalDays: number } | null {
  const plant = getPlantByName(plantName);
  if (!plant) return null;
  const freq = plant.feedingFrequency?.toLowerCase();
  if (!freq || freq === 'none' || freq === '') return null;
  const intervalMap: Record<string, number> = { weekly: 7, fortnightly: 14, monthly: 30 };
  const intervalDays = intervalMap[freq];
  if (!intervalDays) return null;
  return { type: plant.feedingType || 'balanced', frequency: freq, intervalDays };
}

/** Force re-read of CSV (e.g. after edits) */
export function reloadPlantDatabase(): PlantInfo[] {
  _cache = null;
  return getPlantDatabase();
}

// --- Plan-ahead timeline calculation ---

export interface PlannedTimeline {
  sowIndoorsDate: string | null;
  transplantDate: string | null;
  directSowDate: string | null;
  expectedHarvestStart: string | null;
  expectedHarvestEnd: string | null;
  sowMonthLabel: string | null;
  transplantMonthLabel: string | null;
  directSowMonthLabel: string | null;
  harvestMonthLabel: string | null;
  notes: string[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Calculate the recommended planting timeline for a given plant.
 * Uses the CSV sowing/transplant windows and the current date to determine
 * whether to target this year or next year.
 */
export function calculatePlannedTimeline(plantName: string): PlannedTimeline | null {
  const plant = getPlantByName(plantName);
  if (!plant) return null;

  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentYear = today.getFullYear();
  const notes: string[] = [];

  function targetDate(startMonth: number | null, endMonth: number | null, label: string): Date | null {
    if (startMonth === null || endMonth === null) return null;
    let year = currentYear;
    if (currentMonth > endMonth) {
      year = currentYear + 1;
      notes.push(`${label} window (${MONTH_NAMES[startMonth - 1]}\u2013${MONTH_NAMES[endMonth - 1]}) has passed \u2014 scheduled for ${year}`);
    }
    return new Date(year, startMonth - 1, 15);
  }

  const sowDate = targetDate(plant.sowIndoorsStart, plant.sowIndoorsEnd, 'Sow indoors');
  const transplantDate = targetDate(plant.transplantStart, plant.transplantEnd, 'Transplant');
  const directSowDate = targetDate(plant.directSowStart, plant.directSowEnd, 'Direct sow');

  let harvestStart: Date | null = null;
  let harvestEnd: Date | null = null;

  if (transplantDate && plant.daysToHarvestFromTransplant) {
    harvestStart = new Date(transplantDate);
    harvestStart.setDate(harvestStart.getDate() + plant.daysToHarvestFromTransplant);
  } else if (directSowDate && plant.daysToHarvestFromSowing) {
    harvestStart = new Date(directSowDate);
    harvestStart.setDate(harvestStart.getDate() + plant.daysToHarvestFromSowing);
  } else if (sowDate && plant.daysToHarvestFromSowing) {
    harvestStart = new Date(sowDate);
    harvestStart.setDate(harvestStart.getDate() + plant.daysToHarvestFromSowing);
  }

  if (harvestStart) {
    harvestEnd = new Date(harvestStart);
    harvestEnd.setDate(harvestEnd.getDate() + (plant.harvestWindowDays || 30));
  }

  const fmt = (d: Date | null) => d ? d.toISOString().split('T')[0] : null;

  return {
    sowIndoorsDate: fmt(sowDate),
    transplantDate: fmt(transplantDate),
    directSowDate: fmt(directSowDate),
    expectedHarvestStart: fmt(harvestStart),
    expectedHarvestEnd: fmt(harvestEnd),
    sowMonthLabel: sowDate && plant.sowIndoorsStart && plant.sowIndoorsEnd
      ? `${MONTH_NAMES[plant.sowIndoorsStart - 1]}\u2013${MONTH_NAMES[plant.sowIndoorsEnd - 1]}`
      : null,
    transplantMonthLabel: transplantDate && plant.transplantStart && plant.transplantEnd
      ? `${MONTH_NAMES[plant.transplantStart - 1]}\u2013${MONTH_NAMES[plant.transplantEnd - 1]}`
      : null,
    directSowMonthLabel: directSowDate && plant.directSowStart && plant.directSowEnd
      ? `${MONTH_NAMES[plant.directSowStart - 1]}\u2013${MONTH_NAMES[plant.directSowEnd - 1]}`
      : null,
    harvestMonthLabel: harvestStart ? MONTH_NAMES[harvestStart.getMonth()] : null,
    notes,
  };
}
