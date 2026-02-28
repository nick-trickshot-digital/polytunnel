'use client';

import { useEffect, useState } from 'react';
import { PlantIcon } from '@/components/ui/PlantIcon';
import { PlantDetailPanel } from '@/components/plants/PlantDetailPanel';

interface PlantSuggestion {
  name: string;
  icon: string;
  family: string;
  actionLabel: string;
  daysToHarvest: number;
  canTransplant: boolean;
  canDirectSow: boolean;
  canSowIndoors: boolean;
}

interface AvailableBed {
  id: string;
  column: string;
  remaining: number;
  widthMm: number;
}

interface WhatToPlantNowProps {
  onPlantAction: (plantName: string, bedId: string) => void;
}

const monthNames = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function WhatToPlantNow({ onPlantAction }: WhatToPlantNowProps) {
  const [suggestions, setSuggestions] = useState<PlantSuggestion[]>([]);
  const [availableBeds, setAvailableBeds] = useState<AvailableBed[]>([]);
  const [month, setMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPlant, setSelectedPlant] = useState<PlantSuggestion | null>(null);

  useEffect(() => {
    fetch('/api/plants/seasonal')
      .then(res => res.json())
      .then(data => {
        setSuggestions(data.suggestions || []);
        setAvailableBeds(data.availableBeds || []);
        setMonth(data.month || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl md:rounded-xl p-5 md:p-3 border-2 border-earth-200 animate-pulse">
            <div className="h-10 bg-earth-100 rounded-lg mb-2" />
            <div className="h-4 bg-earth-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div>
      <h2 className="text-xl font-800 text-earth-800 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
        What to Plant in {monthNames[month]}
      </h2>
      <p className="text-sm text-earth-400 font-semibold mb-4">
        {suggestions.length} plants ready for your tunnel — tap for details
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-2 stagger-children">
        {suggestions.map(plant => (
          <button
            key={plant.name}
            onClick={() => setSelectedPlant(plant)}
            className="relative bg-white rounded-2xl md:rounded-xl border-2 border-earth-200 overflow-hidden animate-fade-in transition-all hover:border-tunnel-300 text-left p-4 md:p-3 active:scale-[0.97]"
          >
            <div className="flex items-start gap-2">
              <PlantIcon name={plant.name} fallback={plant.icon} size={36} className="md:!w-7 md:!h-7" />
              <div className="flex-1 min-w-0">
                <p className="text-base md:text-sm font-bold text-earth-800 truncate">
                  {plant.name}
                </p>
                <p className="text-sm md:text-xs font-semibold text-tunnel-600 mt-0.5">
                  {plant.actionLabel}
                </p>
                {plant.daysToHarvest > 0 && (
                  <p className="text-xs text-earth-400 font-medium mt-1">
                    ~{Math.round(plant.daysToHarvest / 7)} weeks to harvest
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Plant detail panel */}
      {selectedPlant && (
        <PlantDetailPanel
          plantName={selectedPlant.name}
          actionLabel={selectedPlant.actionLabel}
          availableBeds={availableBeds}
          onPlantAction={onPlantAction}
          onClose={() => setSelectedPlant(null)}
        />
      )}
    </div>
  );
}
