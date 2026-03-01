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

interface PlantGroup {
  label: string;
  key: string;
  plants: PlantSuggestion[];
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

const PREVIEW_COUNT = 4;

export function WhatToPlantNow({ onPlantAction }: WhatToPlantNowProps) {
  const [groups, setGroups] = useState<PlantGroup[]>([]);
  const [availableBeds, setAvailableBeds] = useState<AvailableBed[]>([]);
  const [month, setMonth] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPlant, setSelectedPlant] = useState<PlantSuggestion | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/plants/seasonal')
      .then(res => res.json())
      .then(data => {
        setGroups(data.groups || []);
        setAvailableBeds(data.availableBeds || []);
        setMonth(data.month || 0);
        setTotalCount(data.suggestions?.length || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i}>
            <div className="h-5 bg-earth-100 rounded w-32 mb-3 animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-2">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="bg-white rounded-2xl md:rounded-xl p-5 md:p-3 border-2 border-earth-200 animate-pulse">
                  <div className="h-10 bg-earth-100 rounded-lg mb-2" />
                  <div className="h-4 bg-earth-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) return null;

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const actionIcon = (key: string) => {
    if (key === 'transplant') return '\uD83C\uDF31';
    if (key === 'directSow') return '\uD83C\uDF3E';
    return '\uD83C\uDFE0';
  };

  return (
    <div>
      <h2 className="text-xl font-800 text-earth-800 mb-1" style={{ fontFamily: 'var(--font-display)' }}>
        What to Plant in {monthNames[month]}
      </h2>
      <p className="text-sm text-earth-400 font-semibold mb-4">
        {totalCount} plants ready for your tunnel — tap for details
      </p>

      <div className="space-y-5">
        {groups.map(group => {
          const isExpanded = expandedGroups.has(group.key);
          const visiblePlants = isExpanded ? group.plants : group.plants.slice(0, PREVIEW_COUNT);
          const hiddenCount = group.plants.length - PREVIEW_COUNT;

          return (
            <div key={group.key}>
              <h3 className="text-base font-bold text-earth-600 mb-2 flex items-center gap-2">
                <span>{actionIcon(group.key)}</span>
                <span>{group.label}</span>
                <span className="text-sm font-semibold text-earth-400">({group.plants.length})</span>
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-2 stagger-children">
                {visiblePlants.map(plant => (
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
                        {plant.daysToHarvest > 0 && (
                          <p className="text-xs text-earth-400 font-medium mt-0.5">
                            ~{Math.round(plant.daysToHarvest / 7)} weeks to harvest
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {hiddenCount > 0 && (
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="mt-2 text-sm font-bold text-tunnel-600 hover:text-tunnel-700 transition-colors"
                >
                  {isExpanded ? 'Show less' : `+ ${hiddenCount} more`}
                </button>
              )}
            </div>
          );
        })}
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
