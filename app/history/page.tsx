'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { plantFamilies, getFamilyColor } from '@/lib/utils/rotation';
import { wallyNoHarvests, wallyHasHarvests, wallyNoRotation, pickQuote } from '@/lib/quotes/vickie';
import { PlantIcon } from '@/components/ui/PlantIcon';

interface HarvestRecord {
  id: number;
  plantingId: number;
  dateHarvested: string;
  quantity: string | null;
  notes: string | null;
  plantName: string | null;
  bedId: string | null;
}

interface RotationEntry {
  id: number;
  bedId: string;
  plantName: string;
  plantFamily: string | null;
  year: number;
  season: string | null;
  successRating: number | null;
}

interface BedRotation {
  bedId: string;
  column: string;
  position: number;
  history: RotationEntry[];
}

type Tab = 'harvests' | 'rotation';

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>('harvests');
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
  const [rotation, setRotation] = useState<BedRotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === 'harvests') {
      fetch('/api/harvests')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setHarvests(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      fetch('/api/rotation')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setRotation(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [tab]);

  // Get unique years from rotation data
  const years = [...new Set(rotation.flatMap(b => b.history.map(h => h.year)))].sort((a, b) => b - a);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-6 animate-fade-in">
      <h1
        className="text-3xl font-800 text-earth-800"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Garden Records
      </h1>

      {/* Tab switcher */}
      <div className="flex gap-2 bg-earth-100 rounded-2xl p-1.5 border border-earth-200">
        <button
          onClick={() => setTab('harvests')}
          className={`flex-1 py-3.5 px-5 rounded-xl text-lg transition-colors ${
            tab === 'harvests' ? 'bg-white text-earth-800 font-bold shadow-sm' : 'text-earth-600 font-semibold'
          }`}
        >
          {'\u{1F96C}'} What You Picked
        </button>
        <button
          onClick={() => setTab('rotation')}
          className={`flex-1 py-3.5 px-5 rounded-xl text-lg transition-colors ${
            tab === 'rotation' ? 'bg-white text-earth-800 font-bold shadow-sm' : 'text-earth-600 font-semibold'
          }`}
        >
          {'\u{1F504}'} What Grew Where
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 stagger-children">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-earth-200 animate-pulse">
              <div className="h-6 bg-earth-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : tab === 'harvests' ? (
        // Harvest log
        <div className="space-y-3 stagger-children">
          {harvests.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 border border-earth-200 card-texture flex items-center gap-5">
              <Image
                src="/images/wally.png"
                alt="Wally the spaniel"
                width={96}
                height={96}
                className="w-24 h-24 object-contain flex-shrink-0"
              />
              <div>
                <p className="text-xl font-800 text-earth-700" style={{ fontFamily: 'var(--font-display)' }}>
                  Wally says...
                </p>
                <p className="text-lg text-earth-500 font-semibold mt-1">
                  &ldquo;{pickQuote(wallyNoHarvests)}&rdquo;
                </p>
                <p className="text-base text-earth-500 mt-2">Log your first harvest from a bed&apos;s detail panel</p>
              </div>
            </div>
          ) : (
            <>
            <div className="flex items-center gap-3 px-1">
              <Image
                src="/images/wally.png"
                alt="Wally"
                width={40}
                height={40}
                className="w-10 h-10 object-contain flex-shrink-0"
              />
              <p className="text-base text-earth-600 font-semibold italic">
                &ldquo;{pickQuote(wallyHasHarvests)}&rdquo;
              </p>
            </div>
            {harvests.map(h => (
              <div key={h.id} className="bg-white rounded-2xl px-5 py-4 border border-earth-200 card-texture">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <PlantIcon name={h.plantName || ''} size={26} />
                      <span className="text-lg font-bold text-earth-800">
                        {h.plantName || 'Unknown plant'}
                      </span>
                    </div>
                    {h.bedId && (
                      <span className="text-base text-earth-500 ml-2">Bed {h.bedId}</span>
                    )}
                    {h.quantity && (
                      <p className="text-base text-earth-600 mt-1">{h.quantity}</p>
                    )}
                    {h.notes && (
                      <p className="text-base text-earth-500 mt-1 italic">{h.notes}</p>
                    )}
                  </div>
                  <span className="text-base font-semibold text-earth-600 flex-shrink-0">
                    {new Date(h.dateHarvested).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            ))
            }
            </>
          )}
        </div>
      ) : (
        // Crop rotation view
        <div className="space-y-5">
          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {Object.entries(plantFamilies).map(([key, { name, color }]) => (
              <span
                key={key}
                className="inline-flex items-center gap-2 text-base font-semibold text-earth-700 bg-white px-4 py-2 rounded-2xl border border-earth-200"
              >
                <span
                  className="w-5 h-5 rounded-lg"
                  style={{ backgroundColor: color }}
                />
                {name}
              </span>
            ))}
          </div>

          {years.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 border border-earth-200 card-texture flex items-center gap-5">
              <Image
                src="/images/wally.png"
                alt="Wally the spaniel"
                width={96}
                height={96}
                className="w-24 h-24 object-contain flex-shrink-0"
              />
              <div>
                <p className="text-xl font-800 text-earth-700" style={{ fontFamily: 'var(--font-display)' }}>
                  Wally says...
                </p>
                <p className="text-lg text-earth-500 font-semibold mt-1">
                  &ldquo;{pickQuote(wallyNoRotation)}&rdquo;
                </p>
                <p className="text-base text-earth-500 mt-2">History is recorded when plantings are marked as finished</p>
              </div>
            </div>
          ) : (
            /* Rotation grid */
            <div className="bg-white rounded-2xl border border-earth-200 overflow-x-auto card-texture">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-earth-200">
                    <th className="px-5 py-4 text-left text-earth-600 font-extrabold text-lg">Bed</th>
                    {years.map(y => (
                      <th key={y} className="px-5 py-4 text-center text-earth-600 font-extrabold text-lg">{y}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rotation
                    .sort((a, b) => {
                      const colOrder = { left: 0, middle: 1, right: 2 };
                      const colA = colOrder[a.column as keyof typeof colOrder] ?? 0;
                      const colB = colOrder[b.column as keyof typeof colOrder] ?? 0;
                      if (colA !== colB) return colA - colB;
                      return a.position - b.position;
                    })
                    .map(bed => (
                      <tr key={bed.bedId} className="border-b border-earth-100 last:border-0">
                        <td className="px-5 py-4 font-bold text-lg text-earth-800">{bed.bedId}</td>
                        {years.map(year => {
                          const entry = bed.history.find(h => h.year === year);
                          return (
                            <td key={year} className="px-5 py-4 text-center">
                              {entry ? (
                                <div className="inline-flex flex-col items-center gap-1">
                                  <span
                                    className="inline-flex items-center px-4 py-2 rounded-2xl text-white text-base font-bold"
                                    style={{ backgroundColor: getFamilyColor(entry.plantFamily || 'Other') }}
                                    title={`${entry.plantName} (${entry.plantFamily})`}
                                  >
                                    {entry.plantName}
                                  </span>
                                  {entry.successRating && (
                                    <span className={`text-sm font-bold ${
                                      entry.successRating >= 4 ? 'text-tunnel-600' :
                                      entry.successRating >= 3 ? 'text-earth-500' :
                                      'text-red-500'
                                    }`}>
                                      {Array.from({ length: entry.successRating }, () => '\u2B50').join('')}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-earth-300 text-lg">{'\u2014'}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
