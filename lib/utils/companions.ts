// Adjacency mapping for beds
// Same column ±1, and cross-column at same position for middle beds
export function getAdjacentBeds(bedId: string): string[] {
  const col = bedId[0]; // L, M, or R
  const pos = parseInt(bedId.slice(1));
  const adjacent: string[] = [];

  // Same column, position ± 1
  if (col === 'L' || col === 'R') {
    if (pos > 1) adjacent.push(`${col}${pos - 1}`);
    if (pos < 6) adjacent.push(`${col}${pos + 1}`);
  } else if (col === 'M') {
    if (pos > 1) adjacent.push(`${col}${pos - 1}`);
    if (pos < 5) adjacent.push(`${col}${pos + 1}`);
  }

  // Cross-column adjacency (middle beds are adjacent to same-position side beds)
  if (col === 'M') {
    adjacent.push(`L${pos}`);
    adjacent.push(`R${pos}`);
    // Middle beds also touch the next position on sides
    if (pos < 6) {
      adjacent.push(`L${pos + 1}`);
      adjacent.push(`R${pos + 1}`);
    }
  } else if (col === 'L') {
    // Left beds are adjacent to middle at same and previous position
    if (pos <= 5) adjacent.push(`M${pos}`);
    if (pos > 1 && pos - 1 <= 5) adjacent.push(`M${pos - 1}`);
  } else if (col === 'R') {
    if (pos <= 5) adjacent.push(`M${pos}`);
    if (pos > 1 && pos - 1 <= 5) adjacent.push(`M${pos - 1}`);
  }

  return [...new Set(adjacent)].filter(id => id !== bedId);
}

export function checkCompanionPlanting(
  plantName: string,
  adjacentPlants: string[],
  plantDatabase: Array<{ name: string; companions: string[]; avoid: string[] }>
): { good: string[]; bad: string[] } {
  const plant = plantDatabase.find(
    p => p.name.toLowerCase() === plantName.toLowerCase()
  );
  if (!plant) return { good: [], bad: [] };

  const good: string[] = [];
  const bad: string[] = [];

  for (const adj of adjacentPlants) {
    const adjLower = adj.toLowerCase();
    if (plant.companions.some(c => c.toLowerCase() === adjLower)) {
      good.push(adj);
    }
    if (plant.avoid.some(a => a.toLowerCase() === adjLower)) {
      bad.push(adj);
    }
  }

  return { good, bad };
}

// Bed fraction math
export function fractionToNumber(fraction: string): number {
  switch (fraction) {
    case '1/4': return 0.25;
    case '1/3': return 1 / 3;
    case '1/2': return 0.5;
    case '2/3': return 2 / 3;
    case '3/4': return 0.75;
    case 'full': return 1;
    default: return 0;
  }
}

export function getRemainingSpace(currentFractions: string[]): number {
  const used = currentFractions.reduce((sum, f) => sum + fractionToNumber(f), 0);
  return Math.max(0, 1 - used);
}
