// Plant family mappings and colours for crop rotation
export const plantFamilies: Record<string, { name: string; color: string }> = {
  Solanaceae: { name: 'Solanaceae', color: '#DC2626' },       // Red
  Cucurbitaceae: { name: 'Cucurbitaceae', color: '#16A34A' },  // Green
  Fabaceae: { name: 'Fabaceae', color: '#2563EB' },            // Blue
  Brassicaceae: { name: 'Brassicaceae', color: '#9333EA' },    // Purple
  Asteraceae: { name: 'Asteraceae', color: '#EAB308' },        // Yellow
  Apiaceae: { name: 'Apiaceae', color: '#EA580C' },            // Orange
  Amaranthaceae: { name: 'Amaranthaceae', color: '#EC4899' },  // Pink
  Allium: { name: 'Allium', color: '#92400E' },                // Brown
  Lamiaceae: { name: 'Lamiaceae', color: '#059669' },          // Teal
  Poaceae: { name: 'Poaceae', color: '#65A30D' },              // Lime
  Other: { name: 'Other', color: '#6B7280' },                  // Grey
};

export function getPlantFamily(plantName: string): string {
  const familyMap: Record<string, string> = {
    'Tomatoes': 'Solanaceae',
    'Peppers (Sweet)': 'Solanaceae',
    'Chillies': 'Solanaceae',
    'Aubergines': 'Solanaceae',
    'Sweet Potatoes': 'Solanaceae',
    'Cucumbers': 'Cucurbitaceae',
    'Courgettes': 'Cucurbitaceae',
    'Melon': 'Cucurbitaceae',
    'Squash (Winter)': 'Cucurbitaceae',
    'French Beans': 'Fabaceae',
    'Runner Beans': 'Fabaceae',
    'Peas': 'Fabaceae',
    'Broad Beans': 'Fabaceae',
    'Kale': 'Brassicaceae',
    'Rocket': 'Brassicaceae',
    'Radishes': 'Brassicaceae',
    'Pak Choi': 'Brassicaceae',
    'Lettuce': 'Asteraceae',
    'Carrots': 'Apiaceae',
    'Celery': 'Apiaceae',
    'Celeriac': 'Apiaceae',
    'Parsley': 'Apiaceae',
    'Dill': 'Apiaceae',
    'Florence Fennel': 'Apiaceae',
    'Coriander': 'Apiaceae',
    'Spinach': 'Amaranthaceae',
    'Chard': 'Amaranthaceae',
    'Beetroot': 'Amaranthaceae',
    'Spring Onions': 'Allium',
    'Garlic': 'Allium',
    'Onions': 'Allium',
    'Basil': 'Lamiaceae',
    'Sweetcorn': 'Poaceae',
    'Strawberries': 'Other',
    'Grapes': 'Other',
    'Figs': 'Other',
    'Microgreens': 'Other',
  };
  return familyMap[plantName] || 'Other';
}

export function getFamilyColor(family: string): string {
  return plantFamilies[family]?.color || plantFamilies.Other.color;
}

export interface RotationWarning {
  bedId: string;
  family: string;
  consecutiveYears: number;
  message: string;
}

export function checkRotation(
  bedId: string,
  plantFamily: string,
  history: Array<{ year: number; plantFamily: string | null }>
): RotationWarning | null {
  const currentYear = new Date().getFullYear();
  let consecutive = 0;

  // Count consecutive years of same family (going backwards from last year)
  for (let y = currentYear - 1; y >= currentYear - 5; y--) {
    const yearEntry = history.find(h => h.year === y);
    if (yearEntry && yearEntry.plantFamily === plantFamily) {
      consecutive++;
    } else {
      break;
    }
  }

  if (consecutive >= 2) {
    const alternatives = suggestAlternativeFamilies(plantFamily);
    const altText = alternatives.length > 0 ? ` Try ${alternatives.join(', ')} instead.` : '';
    return {
      bedId,
      family: plantFamily,
      consecutiveYears: consecutive,
      message: `${plantFamily} has been in bed ${bedId} for ${consecutive} consecutive years.${altText}`,
    };
  }

  return null;
}

export function suggestAlternativeFamilies(currentFamily: string): string[] {
  // Classic rotation advice: follow heavy feeders with legumes, then root crops, then brassicas
  const suggestions: Record<string, string[]> = {
    Solanaceae: ['Fabaceae (beans/peas)', 'Brassicaceae (kale/rocket)', 'Apiaceae (carrots/celery)'],
    Cucurbitaceae: ['Fabaceae (beans/peas)', 'Allium (garlic/onions)', 'Amaranthaceae (spinach/chard)'],
    Fabaceae: ['Brassicaceae (kale/rocket)', 'Solanaceae (tomatoes/peppers)', 'Cucurbitaceae (courgettes)'],
    Brassicaceae: ['Fabaceae (beans/peas)', 'Solanaceae (tomatoes/peppers)', 'Apiaceae (carrots/celery)'],
    Apiaceae: ['Fabaceae (beans/peas)', 'Solanaceae (tomatoes/peppers)', 'Brassicaceae (kale/rocket)'],
    Amaranthaceae: ['Fabaceae (beans/peas)', 'Cucurbitaceae (courgettes)', 'Apiaceae (carrots/celery)'],
    Allium: ['Fabaceae (beans/peas)', 'Cucurbitaceae (courgettes)', 'Brassicaceae (kale/rocket)'],
    Asteraceae: ['Fabaceae (beans/peas)', 'Solanaceae (tomatoes/peppers)', 'Apiaceae (carrots/celery)'],
  };
  return suggestions[currentFamily] || ['Fabaceae (beans/peas)', 'Brassicaceae (kale/rocket)'];
}
