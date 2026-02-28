'use client';

import { useEffect, useState } from 'react';
import { AddPlantingModal } from '@/components/planting/AddPlantingModal';
import { PlanPlantingModal } from '@/components/planting/PlanPlantingModal';
import { PlantIcon } from '@/components/ui/PlantIcon';

interface YourPlanting {
  id: number;
  plantName: string;
  variety: string | null;
  bedId: string;
  expectedHarvestStart: string | null;
  expectedHarvestEnd: string | null;
  status: string;
}

interface AvailableBed {
  id: string;
  column: string;
  remaining: number;
}

interface PlantedEntry {
  id: number;
  plantName: string;
  variety: string | null;
  bedId: string;
  datePlanted: string;
  dateSown: string | null;
  status: string;
}

interface PlannedPlanting {
  id: number;
  plantName: string;
  variety: string | null;
  bedId: string;
  plannedSowDate: string | null;
  plannedTransplantDate: string | null;
  expectedHarvestStart: string | null;
}

interface CalendarData {
  month: number;
  sowIndoors: Array<{ name: string; icon: string }>;
  transplant: Array<{ name: string; icon: string }>;
  harvest: Array<{ name: string; icon: string }>;
  yourPlantings: YourPlanting[];
  plantedThisMonth: PlantedEntry[];
  plannedPlantings: PlannedPlanting[];
  tips: string[];
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableBeds, setAvailableBeds] = useState<AvailableBed[]>([]);
  const [bedPickerOpen, setBedPickerOpen] = useState<string | null>(null); // plant name
  const [actionChoice, setActionChoice] = useState<{
    bedId: string;
    plantName: string;
  } | null>(null);
  const [plantingModal, setPlantingModal] = useState<{
    bedId: string;
    plantName: string;
  } | null>(null);
  const [planModal, setPlanModal] = useState<{
    bedId: string;
    plantName: string;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/calendar/${selectedMonth}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedMonth]);

  // Fetch available beds for plant-it buttons
  useEffect(() => {
    fetch('/api/plants/seasonal')
      .then(res => res.json())
      .then(d => {
        if (d.availableBeds) setAvailableBeds(d.availableBeds);
      })
      .catch(() => {});
  }, []);

  const handleSelectBed = (plantName: string, bedId: string) => {
    setBedPickerOpen(null);
    setActionChoice({ bedId, plantName });
  };

  const getRemainingSpace = (bedId: string) => {
    const bed = availableBeds.find(b => b.id === bedId);
    return bed ? bed.remaining : 1;
  };

  const today = new Date().toISOString().split('T')[0];
  const isCurrentMonth = selectedMonth === new Date().getMonth() + 1;

  // Group beds by column
  const bedsByColumn: Record<string, AvailableBed[]> = {};
  for (const bed of availableBeds) {
    if (!bedsByColumn[bed.column]) bedsByColumn[bed.column] = [];
    bedsByColumn[bed.column].push(bed);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 md:py-8 space-y-5">
      <div>
        <h1 className="text-3xl font-900 text-earth-800" style={{ fontFamily: 'var(--font-display)' }}>
          📅 Seasonal Calendar
        </h1>
        <p className="text-lg text-earth-500 font-semibold mt-1">
          What to sow, plant, and harvest each month
        </p>
      </div>

      {/* Month selector — big tap targets */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {monthNames.map((name, i) => {
          const month = i + 1;
          const isCurrent = month === new Date().getMonth() + 1;
          return (
            <button
              key={month}
              onClick={() => setSelectedMonth(month)}
              className={`px-4 py-3 rounded-2xl text-base whitespace-nowrap transition-all flex-shrink-0 ${
                selectedMonth === month
                  ? 'bg-tunnel-600 text-white font-bold border border-tunnel-700 shadow-sm scale-105'
                  : isCurrent
                    ? 'bg-tunnel-50 text-tunnel-700 font-semibold border border-tunnel-300'
                    : 'bg-white text-earth-600 font-semibold border border-earth-200 hover:border-tunnel-300'
              }`}
            >
              {name.slice(0, 3)}
            </button>
          );
        })}
      </div>

      {/* Selected month heading */}
      <h2 className="text-3xl font-900 text-tunnel-700" style={{ fontFamily: 'var(--font-display)' }}>
        {monthNames[selectedMonth - 1]}
      </h2>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-earth-200 animate-pulse">
              <div className="h-6 bg-earth-100 rounded-xl w-1/3 mb-4" />
              <div className="h-5 bg-earth-100 rounded-lg w-2/3" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="space-y-5 stagger-children">

          {/* ═══════════════════════════════════════
              YOUR TUNNEL — Real data first
              ═══════════════════════════════════════ */}
          {data.yourPlantings && data.yourPlantings.length > 0 && (
            <section className="bg-white rounded-2xl p-5 md:p-6 border border-harvest-300 card-texture shadow-sm animate-fade-in">
              <h3 className="text-xl font-800 text-harvest-700 mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                🌾 Ready to Pick {isCurrentMonth ? 'This Month' : `in ${monthNames[selectedMonth - 1]}`}
              </h3>
              <div className="space-y-2">
                {data.yourPlantings.map(p => {
                  const isReady = p.expectedHarvestStart && p.expectedHarvestStart <= today;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border ${
                        isReady ? 'bg-harvest-50 border-harvest-300' : 'bg-earth-50 border-earth-200'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-base font-bold text-earth-800">{p.plantName}</span>
                        {p.variety && (
                          <span className="text-sm text-earth-500 ml-1.5">({p.variety})</span>
                        )}
                        <span className="text-sm text-earth-500 ml-2">Bed {p.bedId}</span>
                      </div>
                      <span className={`text-base font-bold flex-shrink-0 ${isReady ? 'text-harvest-700' : 'text-earth-500'}`}>
                        {isReady
                          ? 'Ready now!'
                          : p.expectedHarvestStart
                            ? new Date(p.expectedHarvestStart + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                            : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Planted / sown this month */}
          {data.plantedThisMonth && data.plantedThisMonth.length > 0 && (
            <section className="bg-white rounded-2xl p-5 md:p-6 border border-tunnel-300 card-texture shadow-sm animate-fade-in">
              <h3 className="text-xl font-800 text-tunnel-700 mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                🌱 Planted {isCurrentMonth ? 'This Month' : `in ${monthNames[selectedMonth - 1]}`}
              </h3>
              <div className="space-y-2">
                {data.plantedThisMonth.map(p => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border ${
                      p.status === 'finished' ? 'bg-earth-50 border-earth-200 opacity-60' :
                      p.status === 'failed' ? 'bg-red-50/30 border-red-200 opacity-60' :
                      'bg-tunnel-50 border-tunnel-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-base font-bold text-earth-800">{p.plantName}</span>
                      {p.variety && (
                        <span className="text-sm text-earth-500 ml-1.5">({p.variety})</span>
                      )}
                      <span className="text-sm text-earth-500 ml-2">Bed {p.bedId}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.dateSown && (
                        <span className="text-sm font-semibold text-earth-500">
                          Sown {new Date(p.dateSown + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      <span className="text-sm font-bold text-tunnel-600">
                        Planted {new Date(p.datePlanted + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                        p.status === 'growing' ? 'bg-tunnel-100 text-tunnel-700' :
                        p.status === 'finished' ? 'bg-earth-100 text-earth-500' :
                        p.status === 'failed' ? 'bg-red-100 text-red-600' :
                        'bg-earth-100 text-earth-500'
                      }`}>
                        {p.status === 'growing' ? 'Still growing' :
                         p.status === 'finished' ? 'Done' :
                         p.status === 'failed' ? 'Didn\'t make it' :
                         p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Planned plantings for this month */}
          {data.plannedPlantings && data.plannedPlantings.length > 0 && (
            <section className="bg-white rounded-2xl p-5 md:p-6 border-2 border-dashed border-blue-300 card-texture shadow-sm animate-fade-in">
              <h3 className="text-xl font-800 text-blue-700 mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                📅 Planned for {isCurrentMonth ? 'This Month' : monthNames[selectedMonth - 1]}
              </h3>
              <div className="space-y-2">
                {data.plannedPlantings.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-blue-200 bg-blue-50/50"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-base font-bold text-blue-900">{p.plantName}</span>
                      {p.variety && (
                        <span className="text-sm text-blue-500 ml-1.5">({p.variety})</span>
                      )}
                      <span className="text-sm text-blue-500 ml-2">Bed {p.bedId}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 text-sm font-semibold">
                      {p.plannedSowDate && new Date(p.plannedSowDate + 'T12:00:00').getMonth() + 1 === selectedMonth && (
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg">
                          Sow {new Date(p.plannedSowDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {p.plannedTransplantDate && new Date(p.plannedTransplantDate + 'T12:00:00').getMonth() + 1 === selectedMonth && (
                        <span className="px-2.5 py-1 bg-tunnel-100 text-tunnel-700 rounded-lg">
                          Plant out {new Date(p.plannedTransplantDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {p.expectedHarvestStart && new Date(p.expectedHarvestStart + 'T12:00:00').getMonth() + 1 === selectedMonth && (
                        <span className="px-2.5 py-1 bg-harvest-100 text-harvest-700 rounded-lg">
                          Harvest {new Date(p.expectedHarvestStart + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ═══════════════════════════════════════
              REFERENCE GUIDE — What you could do
              ═══════════════════════════════════════ */}
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-earth-300 to-transparent" />
            <span className="text-sm font-semibold text-earth-500 uppercase tracking-wider">
              What You Could Plant This Month
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-earth-300 to-transparent" />
          </div>

          {/* Sow indoors — with plant-it buttons */}
          <section className={`bg-white rounded-2xl p-5 md:p-6 border border-amber-200 card-texture shadow-sm animate-fade-in overflow-visible ${bedPickerOpen?.startsWith('sow-') ? 'relative z-20' : ''}`}>
            <h3 className="text-xl font-800 text-amber-800 mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              🌱 Start Seeds in Pots / Trays
            </h3>
            {data.sowIndoors.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.sowIndoors.map(p => (
                  <div key={p.name} className="relative">
                    <button
                      onClick={() => setBedPickerOpen(bedPickerOpen === `sow-${p.name}` ? null : `sow-${p.name}`)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-base font-semibold border transition-all ${
                        bedPickerOpen === `sow-${p.name}`
                          ? 'bg-amber-200 text-amber-900 border-amber-400 scale-105'
                          : 'bg-amber-50 text-amber-900 border-amber-200 hover:border-amber-400 active:scale-95'
                      }`}
                    >
                      <PlantIcon name={p.name} fallback={p.icon} size={22} /> {p.name}
                      <span className="text-amber-500 text-sm ml-1">+</span>
                    </button>
                    {bedPickerOpen === `sow-${p.name}` && availableBeds.length > 0 && (
                      <div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-xl border border-earth-200 shadow-xl p-3 min-w-[200px]">
                        <p className="text-xs font-bold text-earth-500 mb-2 uppercase tracking-wide">Plant in:</p>
                        <div className="space-y-1.5">
                          {Object.entries(bedsByColumn).map(([, colBeds]) => (
                            <div key={colBeds[0]?.column} className="flex flex-wrap gap-1.5">
                              {colBeds.map(bed => (
                                <button
                                  key={bed.id}
                                  onClick={() => handleSelectBed(p.name, bed.id)}
                                  className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-earth-50 border border-earth-200 text-earth-700 hover:border-tunnel-400 hover:bg-tunnel-50 active:scale-95 transition-all"
                                >
                                  {bed.id}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-lg text-earth-500 italic font-medium">No seeds to start this month</p>
            )}
          </section>

          {/* Transplant — with plant-it buttons */}
          <section className={`bg-white rounded-2xl p-5 md:p-6 border border-tunnel-200 card-texture shadow-sm animate-fade-in overflow-visible ${bedPickerOpen?.startsWith('tp-') ? 'relative z-20' : ''}`}>
            <h3 className="text-xl font-800 text-tunnel-800 mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              🏠 Plant Out into Beds
            </h3>
            {data.transplant.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.transplant.map(p => (
                  <div key={p.name} className="relative">
                    <button
                      onClick={() => setBedPickerOpen(bedPickerOpen === `tp-${p.name}` ? null : `tp-${p.name}`)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-base font-semibold border transition-all ${
                        bedPickerOpen === `tp-${p.name}`
                          ? 'bg-tunnel-200 text-tunnel-900 border-tunnel-400 scale-105'
                          : 'bg-tunnel-50 text-tunnel-900 border-tunnel-200 hover:border-tunnel-400 active:scale-95'
                      }`}
                    >
                      <PlantIcon name={p.name} fallback={p.icon} size={22} /> {p.name}
                      <span className="text-tunnel-500 text-sm ml-1">+</span>
                    </button>
                    {bedPickerOpen === `tp-${p.name}` && availableBeds.length > 0 && (
                      <div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-xl border border-earth-200 shadow-xl p-3 min-w-[200px]">
                        <p className="text-xs font-bold text-earth-500 mb-2 uppercase tracking-wide">Plant in:</p>
                        <div className="space-y-1.5">
                          {Object.entries(bedsByColumn).map(([, colBeds]) => (
                            <div key={colBeds[0]?.column} className="flex flex-wrap gap-1.5">
                              {colBeds.map(bed => (
                                <button
                                  key={bed.id}
                                  onClick={() => handleSelectBed(p.name, bed.id)}
                                  className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-earth-50 border border-earth-200 text-earth-700 hover:border-tunnel-400 hover:bg-tunnel-50 active:scale-95 transition-all"
                                >
                                  {bed.id}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-lg text-earth-500 italic font-medium">Nothing to move into beds this month</p>
            )}
          </section>

          {/* Harvest — reference only, no action needed */}
          <section className="bg-white rounded-2xl p-5 md:p-6 border border-terracotta-200 card-texture shadow-sm animate-fade-in">
            <h3 className="text-xl font-800 text-terracotta-700 mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              🥬 Typically Ready to Pick Now
            </h3>
            {data.harvest.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.harvest.map(p => (
                  <span
                    key={p.name}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-terracotta-50 text-terracotta-900 rounded-xl text-base font-semibold border border-terracotta-200"
                  >
                    <PlantIcon name={p.name} fallback={p.icon} size={22} /> {p.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-lg text-earth-500 italic font-medium">Nothing typically ready to pick this month</p>
            )}
          </section>

          {/* Monthly tips */}
          {data.tips.length > 0 && (
            <section className="bg-white rounded-2xl p-5 md:p-6 border border-earth-200 card-texture shadow-sm animate-fade-in">
              <h3 className="text-xl font-800 text-earth-800 mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                💡 Monthly Tips for Surrey
              </h3>
              <ul className="space-y-3">
                {data.tips.map((tip, i) => (
                  <li key={i} className="text-base text-earth-700 flex items-start gap-3 font-medium">
                    <span className="text-tunnel-400 text-lg mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <p className="text-lg text-earth-400 font-semibold">Failed to load calendar data</p>
      )}

      {/* Action choice — Plant Now vs Plan for Later */}
      {actionChoice && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm" onClick={() => setActionChoice(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-[61] px-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-earth-200 p-6 w-full max-w-sm animate-slide-up">
              <div className="text-center mb-5">
                <PlantIcon name={actionChoice.plantName} size={48} />
                <h3 className="text-xl font-extrabold text-earth-800 mt-2" style={{ fontFamily: 'var(--font-display)' }}>
                  {actionChoice.plantName}
                </h3>
                <p className="text-base text-earth-500 font-semibold mt-0.5">
                  Bed {actionChoice.bedId}
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    const choice = actionChoice;
                    setActionChoice(null);
                    setPlantingModal(choice);
                  }}
                  className="w-full py-4 bg-tunnel-600 text-white rounded-2xl text-lg font-bold hover:bg-tunnel-700 transition-colors shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {'🌱'} Plant Now
                </button>
                <button
                  onClick={() => {
                    const choice = actionChoice;
                    setActionChoice(null);
                    setPlanModal(choice);
                  }}
                  className="w-full py-4 bg-white text-blue-700 rounded-2xl text-lg font-bold border-2 border-dashed border-blue-300 hover:bg-blue-50 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {'📅'} Plan for Later
                </button>
              </div>
              <button
                onClick={() => setActionChoice(null)}
                className="w-full mt-3 py-3 text-earth-500 text-base font-semibold hover:text-earth-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Planting modal */}
      {plantingModal && (
        <AddPlantingModal
          bedId={plantingModal.bedId}
          remainingSpace={getRemainingSpace(plantingModal.bedId)}
          initialPlantName={plantingModal.plantName}
          onClose={() => setPlantingModal(null)}
          onSuccess={() => {
            setPlantingModal(null);
            fetch(`/api/calendar/${selectedMonth}`)
              .then(res => res.json())
              .then(d => setData(d))
              .catch(() => {});
          }}
        />
      )}

      {/* Plan planting modal */}
      {planModal && (
        <PlanPlantingModal
          bedId={planModal.bedId}
          remainingSpace={getRemainingSpace(planModal.bedId)}
          initialPlantName={planModal.plantName}
          onClose={() => setPlanModal(null)}
          onSuccess={() => {
            setPlanModal(null);
            fetch(`/api/calendar/${selectedMonth}`)
              .then(res => res.json())
              .then(d => setData(d))
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}
