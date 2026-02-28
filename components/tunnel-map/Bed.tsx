'use client';

import { fractionToNumber } from '@/lib/utils/companions';
import { PlantIcon } from '@/components/ui/PlantIcon';
import type { BedData } from './TunnelMap';

interface BedProps {
  bed: BedData;
  onClick: () => void;
  isSelected: boolean;
  landscape?: boolean;
}

const plantColors: Record<string, string> = {
  'Tomatoes': '#DC2626',
  'Cucumbers': '#16A34A',
  'Peppers (Sweet)': '#CA8A04',
  'Chillies': '#EA580C',
  'Aubergines': '#7C3AED',
  'Lettuce': '#65A30D',
  'Basil': '#059669',
  'French Beans': '#22C55E',
  'Runner Beans': '#15803D',
  'Courgettes': '#65A30D',
  'Strawberries': '#E11D48',
  'Radishes': '#F43F5E',
  'Spinach': '#166534',
  'Spring Onions': '#84CC16',
  'Carrots': '#F97316',
  'Beetroot': '#881337',
  'Kale': '#14532D',
  'Chard': '#D97706',
  'Pak Choi': '#4ADE80',
  'Rocket': '#86EFAC',
  'Coriander': '#34D399',
  'Parsley': '#10B981',
  'Dill': '#6EE7B7',
  'Melon': '#EAB308',
  'Grapes': '#6D28D9',
  'Figs': '#92400E',
  'Sweetcorn': '#EAB308',
  'Squash (Winter)': '#D97706',
  'Peas': '#4ADE80',
  'Broad Beans': '#22D3EE',
  'Florence Fennel': '#A7F3D0',
  'Celery': '#86EFAC',
  'Celeriac': '#A3A38C',
  'Sweet Potatoes': '#C2410C',
  'Microgreens': '#BBF7D0',
  'Garlic': '#D1D5DB',
  'Onions (Overwintering Sets)': '#D4A574',
  'Mint': '#34D399',
  'Chives': '#84CC16',
  'Thyme': '#A78BFA',
  'Oregano': '#8B5CF6',
  'Sorrel': '#65A30D',
  'Nasturtiums': '#F59E0B',
  'Marigolds': '#F59E0B',
  'Turnips': '#E2E8F0',
  'Kohlrabi': '#A3E635',
  'Leeks': '#84CC16',
  'Potatoes (Early)': '#A3A38C',
  'Mangetout': '#4ADE80',
  'Calabrese/Broccoli': '#16A34A',
  'Spring Cabbage': '#22C55E',
  'Mizuna': '#86EFAC',
  'Mustard Greens': '#65A30D',
  'Land Cress': '#34D399',
  'Endive': '#A3E635',
  'Perpetual Spinach': '#166534',
  'Okra': '#16A34A',
  'Raspberries': '#E11D48',
  'Rosemary': '#6366F1',
  'Sage': '#8B5CF6',
  'Lemon Balm': '#A7F3D0',
  'Tarragon (French)': '#6EE7B7',
  'Chervil': '#34D399',
  'Borage': '#3B82F6',
  'Sunflowers': '#EAB308',
  'Peaches': '#FB923C',
  'Pumpkins': '#EA580C',
  'Watercress': '#059669',
};

function getPlantColor(plantName: string): string {
  return plantColors[plantName] || '#4ADE80';
}

export function Bed({ bed, onClick, isSelected, landscape }: BedProps) {
  const activePlantings = bed.plantings.filter(p => p.status !== 'finished' && p.status !== 'failed');
  const growingPlantings = activePlantings.filter(p => p.status !== 'planned');
  const plannedPlantings = activePlantings.filter(p => p.status === 'planned');
  const totalFraction = activePlantings.reduce((sum, p) => sum + fractionToNumber(p.bedFraction), 0);
  const hasHarvestReady = activePlantings.some(p => p.status === 'harvesting');
  const isEmpty = activePlantings.length === 0;
  const isOnlyPlanned = growingPlantings.length === 0 && plannedPlantings.length > 0;

  // Gradient runs along the bed length: top-to-bottom (portrait) or left-to-right (landscape)
  const gradientDir = landscape ? 'to right' : 'to bottom';
  const bgStyle: React.CSSProperties = {};
  if (activePlantings.length === 1) {
    bgStyle.backgroundColor = getPlantColor(activePlantings[0].plantName);
  } else if (activePlantings.length > 1) {
    const stops: string[] = [];
    let pos = 0;
    for (const p of activePlantings) {
      const frac = fractionToNumber(p.bedFraction) / Math.max(totalFraction, 1);
      const color = getPlantColor(p.plantName);
      stops.push(`${color} ${Math.round(pos * 100)}%`);
      pos += frac;
      stops.push(`${color} ${Math.round(pos * 100)}%`);
    }
    bgStyle.background = `linear-gradient(${gradientDir}, ${stops.join(', ')})`;
  }

  return (
    <button
      onClick={onClick}
      className={`
        relative rounded-md overflow-hidden
        transition-all duration-150 cursor-pointer group
        ${landscape ? 'h-full flex-1 min-w-0' : 'w-full h-36'}
        ${isSelected
          ? 'ring-2 ring-tunnel-500 ring-offset-1 scale-[1.03] z-10'
          : 'hover:ring-1 hover:ring-tunnel-400 hover:ring-offset-1'}
        ${hasHarvestReady ? 'harvest-ready' : ''}
      `}
    >
      {/* Background */}
      <div
        className={`absolute inset-0 ${isEmpty ? 'bg-earth-200/70' : ''} ${isOnlyPlanned ? 'opacity-40' : ''}`}
        style={isEmpty ? {} : bgStyle}
      />

      {/* Subtle sheen */}
      {!isEmpty && (
        <div className={`absolute inset-0 ${landscape ? 'bg-gradient-to-r from-white/15 to-transparent' : 'bg-gradient-to-b from-white/15 to-transparent'}`} />
      )}

      {/* Dark overlay for planted beds — improves text readability */}
      {!isEmpty && (
        <div className="absolute inset-0 bg-black/20" />
      )}

      {/* Content */}
      <div className={`relative z-10 h-full flex flex-col items-center justify-center px-1 ${landscape ? 'py-0.5 gap-0.5' : 'py-1.5 gap-1'}`}>
        {/* Empty bed */}
        {isEmpty && (
          <>
            <span className="text-xs font-extrabold tracking-wide text-earth-400">
              {bed.id}
            </span>
          </>
        )}

        {/* Single planting */}
        {activePlantings.length === 1 && (
          <>
            <PlantIcon name={activePlantings[0].plantName} size={landscape ? 24 : 36} />
            <span className={`font-extrabold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] truncate max-w-full text-center leading-tight ${landscape ? 'text-[10px]' : 'text-xs'}`}>
              {activePlantings[0].plantName}
            </span>
            <span className={`font-bold text-white/60 ${landscape ? 'text-[8px]' : 'text-[10px]'}`}>
              {bed.id}
            </span>
          </>
        )}

        {/* Multiple plantings */}
        {activePlantings.length > 1 && (
          <>
            <div className="flex items-center -space-x-1.5">
              {activePlantings.slice(0, 3).map((p, i) => (
                <div key={p.id} className="rounded-full border border-white/50" style={{ zIndex: 3 - i }}>
                  <PlantIcon name={p.plantName} size={landscape ? 18 : 26} />
                </div>
              ))}
            </div>
            <span className={`font-extrabold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] text-center leading-tight ${landscape ? 'text-[9px]' : 'text-[11px]'}`}>
              {activePlantings.length} crops
            </span>
            <span className={`font-bold text-white/60 ${landscape ? 'text-[8px]' : 'text-[10px]'}`}>
              {bed.id}
            </span>
          </>
        )}

        {/* Status indicators */}
        {hasHarvestReady && (
          <span className={`absolute ${landscape ? 'top-0.5 right-0.5 text-[10px]' : 'top-1 right-1 text-sm'}`}>{'\uD83E\uDD6C'}</span>
        )}
        {isOnlyPlanned && !hasHarvestReady && (
          <span className={`absolute ${landscape ? 'top-0.5 right-0.5 text-[10px]' : 'top-1 right-1 text-sm'}`}>{'\uD83D\uDCC5'}</span>
        )}
      </div>

      {/* Planned indicator */}
      {isOnlyPlanned && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-400/60 rounded-md pointer-events-none" />
      )}

      {/* Hover */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
    </button>
  );
}
