'use client';

import { useEffect, useState } from 'react';
import { PlantIcon } from '@/components/ui/PlantIcon';
import { getPlantImageSrc } from '@/components/ui/PlantIcon';
import { useModal } from '@/lib/hooks/useModal';
import Image from 'next/image';

interface PlantDetail {
  name: string;
  family: string;
  type: 'annual' | 'perennial' | 'biennial';
  icon: string;
  spacingCm: number | null;
  minTempC: number | null;
  feedingType: string;
  feedingFrequency: string;
  daysToHarvest: number;
  daysToHarvestFromSowing: number | null;
  daysToHarvestFromTransplant: number | null;
  harvestWindowDays: number | null;
  companions: string[];
  avoid: string[];
  sowIndoorMonths: number[];
  directSowMonths: number[];
  transplantMonths: number[];
  harvestMonths: number[];
}

interface AvailableBed {
  id: string;
  column: string;
  remaining: number;
}

interface PlantDetailPanelProps {
  plantName: string;
  actionLabel: string;
  availableBeds: AvailableBed[];
  onPlantAction: (plantName: string, bedId: string) => void;
  onClose: () => void;
}

const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

const typeLabels: Record<string, string> = {
  annual: 'Annual',
  perennial: 'Perennial',
  biennial: 'Biennial',
};

function feedingDescription(type: string, frequency: string): string | null {
  if (type === 'none' || !type) return null;
  const typeMap: Record<string, string> = {
    'balanced': 'Balanced feed',
    'high potash': 'High potash feed (e.g. tomato feed)',
    'nitrogen': 'Nitrogen-rich feed',
    'light': 'Light feed',
  };
  const freqMap: Record<string, string> = {
    'weekly': 'weekly',
    'fortnightly': 'every 2 weeks',
    'monthly': 'monthly',
  };
  const t = typeMap[type] || type;
  const f = freqMap[frequency] || frequency;
  if (f === 'none' || !f) return t;
  return `${t}, ${f}`;
}

export function PlantDetailPanel({
  plantName,
  actionLabel,
  availableBeds,
  onPlantAction,
  onClose,
}: PlantDetailPanelProps) {
  useModal(onClose);
  const [plant, setPlant] = useState<PlantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [bedPickerOpen, setBedPickerOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/plants/${encodeURIComponent(plantName)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.name) setPlant(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [plantName]);

  const currentMonth = new Date().getMonth() + 1;

  // Group beds by column for picker
  const bedsByColumn: Record<string, AvailableBed[]> = {};
  for (const bed of availableBeds) {
    if (!bedsByColumn[bed.column]) bedsByColumn[bed.column] = [];
    bedsByColumn[bed.column].push(bed);
  }

  const imageSrc = getPlantImageSrc(plantName);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-[55] backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div role="dialog" aria-modal="true" aria-label={`${plantName} details`} className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-0 md:right-0 md:left-auto md:w-[480px] z-[56] bg-white rounded-t-3xl md:rounded-none md:rounded-l-3xl shadow-2xl max-h-[85vh] md:max-h-screen md:h-screen flex flex-col overflow-hidden animate-slide-up">

        {/* Header with hero image */}
        <div className="relative">
          {imageSrc ? (
            <div className="relative h-48 md:h-56 overflow-hidden">
              <Image
                src={imageSrc}
                alt={plantName}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                <h2
                  className="text-3xl font-800 text-white drop-shadow-lg"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {plantName}
                </h2>
                {plant && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-base text-white/80 font-medium">{plant.family}</span>
                    <span className="text-white/40">·</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-white/20 text-white backdrop-blur-sm">
                      {typeLabels[plant.type] || plant.type}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 md:p-6 bg-tunnel-50 flex items-center gap-4">
              <PlantIcon name={plantName} size={64} />
              <div>
                <h2
                  className="text-2xl font-800 text-earth-800"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {plantName}
                </h2>
                {plant && (
                  <p className="text-base text-earth-600 font-medium mt-0.5">
                    {plant.family} · {typeLabels[plant.type] || plant.type}
                  </p>
                )}
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white text-lg font-bold hover:bg-black/50 transition-colors"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-earth-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : plant ? (
            <>
              {/* Action label */}
              <div className="bg-tunnel-50 rounded-2xl p-4 border border-tunnel-200">
                <p className="text-lg font-bold text-tunnel-800" style={{ fontFamily: 'var(--font-display)' }}>
                  {actionLabel}
                </p>
                <p className="text-base text-tunnel-600 font-medium mt-1">
                  {plant.daysToHarvest > 0
                    ? `About ${Math.round(plant.daysToHarvest / 7)} weeks until you can harvest`
                    : 'Check growing conditions below'}
                </p>
              </div>

              {/* Growing Timeline */}
              <div>
                <h3 className="text-lg font-bold text-earth-800 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                  Growing Calendar
                </h3>
                <div className="bg-earth-50 rounded-2xl p-4 border border-earth-200">
                  <div className="grid grid-cols-12 gap-1 mb-2">
                    {monthLabels.map((label, i) => (
                      <div
                        key={i}
                        className={`text-center text-xs font-bold ${
                          i + 1 === currentMonth ? 'text-tunnel-700' : 'text-earth-500'
                        }`}
                      >
                        {label}
                      </div>
                    ))}
                  </div>

                  {/* Sow indoors row */}
                  {plant.sowIndoorMonths.length > 0 && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="grid grid-cols-12 gap-1 flex-1">
                        {Array.from({ length: 12 }, (_, i) => {
                          const month = i + 1;
                          const active = plant.sowIndoorMonths.includes(month);
                          const isCurrent = month === currentMonth;
                          return (
                            <div
                              key={i}
                              className={`h-6 rounded-md transition-colors ${
                                active
                                  ? isCurrent ? 'bg-amber-500 ring-2 ring-amber-300' : 'bg-amber-400'
                                  : 'bg-earth-100'
                              }`}
                            />
                          );
                        })}
                      </div>
                      <span className="text-xs font-semibold text-earth-600 w-20 text-right">Sow inside</span>
                    </div>
                  )}

                  {/* Direct sow row */}
                  {plant.directSowMonths.length > 0 && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="grid grid-cols-12 gap-1 flex-1">
                        {Array.from({ length: 12 }, (_, i) => {
                          const month = i + 1;
                          const active = plant.directSowMonths.includes(month);
                          const isCurrent = month === currentMonth;
                          return (
                            <div
                              key={i}
                              className={`h-6 rounded-md transition-colors ${
                                active
                                  ? isCurrent ? 'bg-green-500 ring-2 ring-green-300' : 'bg-green-400'
                                  : 'bg-earth-100'
                              }`}
                            />
                          );
                        })}
                      </div>
                      <span className="text-xs font-semibold text-earth-600 w-20 text-right">Direct sow</span>
                    </div>
                  )}

                  {/* Transplant row */}
                  {plant.transplantMonths.length > 0 && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="grid grid-cols-12 gap-1 flex-1">
                        {Array.from({ length: 12 }, (_, i) => {
                          const month = i + 1;
                          const active = plant.transplantMonths.includes(month);
                          const isCurrent = month === currentMonth;
                          return (
                            <div
                              key={i}
                              className={`h-6 rounded-md transition-colors ${
                                active
                                  ? isCurrent ? 'bg-tunnel-600 ring-2 ring-tunnel-300' : 'bg-tunnel-500'
                                  : 'bg-earth-100'
                              }`}
                            />
                          );
                        })}
                      </div>
                      <span className="text-xs font-semibold text-earth-600 w-20 text-right">Plant out</span>
                    </div>
                  )}

                  {/* Harvest row */}
                  {plant.harvestMonths.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="grid grid-cols-12 gap-1 flex-1">
                        {Array.from({ length: 12 }, (_, i) => {
                          const month = i + 1;
                          const active = plant.harvestMonths.includes(month);
                          const isCurrent = month === currentMonth;
                          return (
                            <div
                              key={i}
                              className={`h-6 rounded-md transition-colors ${
                                active
                                  ? isCurrent ? 'bg-terracotta-500 ring-2 ring-terracotta-300' : 'bg-terracotta-400'
                                  : 'bg-earth-100'
                              }`}
                            />
                          );
                        })}
                      </div>
                      <span className="text-xs font-semibold text-earth-600 w-20 text-right">Harvest</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Facts */}
              <div>
                <h3 className="text-lg font-bold text-earth-800 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                  Quick Facts
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {plant.spacingCm && (
                    <div className="bg-earth-50 rounded-xl p-3 border border-earth-200">
                      <p className="text-2xl mb-1">📏</p>
                      <p className="text-sm font-bold text-earth-800">{plant.spacingCm}cm apart</p>
                      <p className="text-xs text-earth-500 font-medium">Plant spacing</p>
                    </div>
                  )}
                  {plant.minTempC !== null && (
                    <div className="bg-earth-50 rounded-xl p-3 border border-earth-200">
                      <p className="text-2xl mb-1">🌡️</p>
                      <p className="text-sm font-bold text-earth-800">{plant.minTempC}°C minimum</p>
                      <p className="text-xs text-earth-500 font-medium">Temperature</p>
                    </div>
                  )}
                  {plant.daysToHarvest > 0 && (
                    <div className="bg-earth-50 rounded-xl p-3 border border-earth-200">
                      <p className="text-2xl mb-1">⏱️</p>
                      <p className="text-sm font-bold text-earth-800">~{Math.round(plant.daysToHarvest / 7)} weeks</p>
                      <p className="text-xs text-earth-500 font-medium">To harvest</p>
                    </div>
                  )}
                  {feedingDescription(plant.feedingType, plant.feedingFrequency) && (
                    <div className="bg-earth-50 rounded-xl p-3 border border-earth-200">
                      <p className="text-2xl mb-1">🧪</p>
                      <p className="text-sm font-bold text-earth-800">{feedingDescription(plant.feedingType, plant.feedingFrequency)}</p>
                      <p className="text-xs text-earth-500 font-medium">Feeding</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Companions */}
              {(plant.companions.length > 0 || plant.avoid.length > 0) && (
                <div>
                  <h3 className="text-lg font-bold text-earth-800 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                    Companion Planting
                  </h3>
                  {plant.companions.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-earth-600 mb-2">Grows well with</p>
                      <div className="flex flex-wrap gap-2">
                        {plant.companions.map(c => (
                          <span
                            key={c}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-tunnel-50 text-tunnel-800 border border-tunnel-200"
                          >
                            <PlantIcon name={c} size={18} />
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {plant.avoid.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-earth-600 mb-2">Keep away from</p>
                      <div className="flex flex-wrap gap-2">
                        {plant.avoid.map(a => (
                          <span
                            key={a}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-red-50 text-red-800 border border-red-200"
                          >
                            <PlantIcon name={a} size={18} />
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-earth-500 text-center py-8">Could not load plant details</p>
          )}
        </div>

        {/* Footer — Plant this button */}
        <div className="p-5 md:p-6 border-t border-earth-200 bg-white">
          {!bedPickerOpen ? (
            <button
              onClick={() => setBedPickerOpen(true)}
              className="w-full py-4 bg-tunnel-600 text-white rounded-2xl text-lg font-bold hover:bg-tunnel-700 active:scale-[0.98] transition-all shadow-sm"
            >
              🌱 Plant {plantName}
            </button>
          ) : (
            <div>
              <p className="text-sm font-bold text-earth-600 mb-3 uppercase tracking-wide">Choose a bed:</p>
              {availableBeds.length === 0 ? (
                <p className="text-base text-earth-500 font-medium">No beds with space available</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(bedsByColumn).map(([col, colBeds]) => (
                    <div key={col} className="flex flex-wrap gap-2">
                      {colBeds.map(bed => (
                        <button
                          key={bed.id}
                          onClick={() => {
                            onPlantAction(plantName, bed.id);
                            onClose();
                          }}
                          className="px-4 py-2.5 rounded-xl text-base font-semibold bg-white border border-earth-200 text-earth-700 hover:border-tunnel-400 hover:bg-tunnel-50 active:scale-95 transition-all"
                        >
                          {bed.id}
                          {bed.remaining < 1 && (
                            <span className="text-earth-400 ml-1 text-sm">
                              {Math.round(bed.remaining * 100)}%
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setBedPickerOpen(false)}
                className="mt-3 text-sm font-semibold text-earth-500 hover:text-earth-700"
              >
                {'\u2190'} Back
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
