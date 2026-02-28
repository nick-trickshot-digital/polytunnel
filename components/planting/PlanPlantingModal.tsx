'use client';

import { useState, useEffect } from 'react';
import { FractionPicker } from './FractionPicker';
import { PlantSelector } from './PlantSelector';
import { useModal } from '@/lib/hooks/useModal';
import { useToast } from '@/components/ui/Toast';

interface PlannedTimeline {
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

interface PlanPlantingModalProps {
  bedId: string;
  remainingSpace: number;
  onClose: () => void;
  onSuccess: () => void;
  initialPlantName?: string;
}

export function PlanPlantingModal({ bedId, remainingSpace, onClose, onSuccess, initialPlantName }: PlanPlantingModalProps) {
  useModal(onClose);
  const toast = useToast();
  const [plantName, setPlantName] = useState(initialPlantName || '');
  const [variety, setVariety] = useState('');
  const [bedFraction, setBedFraction] = useState('full');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [timeline, setTimeline] = useState<PlannedTimeline | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [companionInfo, setCompanionInfo] = useState<{ good: string[]; bad: string[] } | null>(null);
  const [rotationCheck, setRotationCheck] = useState<{ family: string; consecutiveYears: number; message: string } | null>(null);

  // Fetch timeline when plant selected
  useEffect(() => {
    if (!plantName) {
      setTimeline(null);
      return;
    }
    setLoadingTimeline(true);
    fetch(`/api/plantings/plan-timeline?plant=${encodeURIComponent(plantName)}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setTimeline(data);
      })
      .catch(() => {})
      .finally(() => setLoadingTimeline(false));
  }, [plantName]);

  // Check companions and rotation
  useEffect(() => {
    if (!plantName) {
      setCompanionInfo(null);
      setRotationCheck(null);
      return;
    }
    fetch(`/api/beds/${bedId}?checkCompanions=${encodeURIComponent(plantName)}&checkRotation=${encodeURIComponent(plantName)}`)
      .then(res => res.json())
      .then(data => {
        if (data.companions) setCompanionInfo(data.companions);
        setRotationCheck(data.rotationCheck || null);
      })
      .catch(() => {});
  }, [plantName, bedId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plantName) {
      setError('Please select a plant');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/plantings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bedId,
          plantName,
          variety: variety || null,
          bedFraction,
          notes: notes || null,
          mode: 'planned',
          plannedSowDate: timeline?.sowIndoorsDate || timeline?.directSowDate || null,
          plannedTransplantDate: timeline?.transplantDate || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to plan planting');
      }

      toast(`${plantName} planned for bed ${bedId}!`);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasTimeline = timeline && (timeline.sowIndoorsDate || timeline.directSowDate || timeline.transplantDate);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Plan a future planting" className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:max-h-[90vh] z-[61] bg-white md:rounded-2xl shadow-2xl flex flex-col overflow-hidden md:border border-blue-200 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-blue-200 bg-blue-50">
          <div>
            <h2
              className="text-2xl font-extrabold text-blue-900"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Plan a Future Planting
            </h2>
            <p className="text-base text-blue-600 font-semibold mt-0.5">Bed {bedId}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 hover:bg-blue-200 text-blue-500 text-xl font-bold transition-colors"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Plant selector */}
          <div>
            <label className="block text-base font-semibold text-earth-700 mb-2">What do you want to grow? *</label>
            <PlantSelector value={plantName} onChange={setPlantName} />
          </div>

          {/* Companion planting alerts */}
          {companionInfo && (companionInfo.good.length > 0 || companionInfo.bad.length > 0) && (
            <div className="space-y-2">
              {companionInfo.good.map(g => (
                <div key={g} className="text-base bg-green-50 text-green-700 px-4 py-3 rounded-2xl border border-green-200 font-medium">
                  {'\u2705'} Good match — {g} grows well nearby
                </div>
              ))}
              {companionInfo.bad.map(b => (
                <div key={b} className="text-base bg-amber-50 text-amber-700 px-4 py-3 rounded-2xl border border-amber-200 font-medium">
                  {'\u26A0\uFE0F'} Heads up — {b} is nearby and doesn&apos;t grow well with this plant
                </div>
              ))}
            </div>
          )}

          {/* Rotation warning */}
          {rotationCheck && (
            <div className="text-base bg-amber-50 text-amber-800 px-4 py-3 rounded-2xl border border-amber-200 font-medium">
              {'\u26A0\uFE0F'} {rotationCheck.message}
            </div>
          )}

          {/* Timeline display */}
          {loadingTimeline && (
            <div className="text-base text-blue-500 font-medium animate-pulse">Loading recommended timeline...</div>
          )}

          {timeline && hasTimeline && (
            <div className="bg-blue-50/70 rounded-2xl p-4 border-2 border-dashed border-blue-200">
              <h3 className="text-base font-bold text-blue-800 mb-3">Recommended Timeline</h3>
              <div className="space-y-2.5">
                {(timeline.sowIndoorsDate || timeline.sowMonthLabel) && (
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-lg text-lg">🌱</span>
                    <div>
                      <div className="text-sm font-bold text-blue-800">Sow Indoors</div>
                      <div className="text-sm text-blue-600">{timeline.sowMonthLabel}</div>
                    </div>
                  </div>
                )}
                {(timeline.directSowDate || timeline.directSowMonthLabel) && !timeline.sowIndoorsDate && (
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-lg text-lg">🌱</span>
                    <div>
                      <div className="text-sm font-bold text-blue-800">Direct Sow</div>
                      <div className="text-sm text-blue-600">{timeline.directSowMonthLabel}</div>
                    </div>
                  </div>
                )}
                {timeline.sowIndoorsDate && timeline.transplantDate && (
                  <div className="ml-3.5 w-0.5 h-3 bg-blue-200" />
                )}
                {(timeline.transplantDate || timeline.transplantMonthLabel) && (
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center bg-tunnel-100 rounded-lg text-lg">🌿</span>
                    <div>
                      <div className="text-sm font-bold text-tunnel-800">Plant Out into Bed</div>
                      <div className="text-sm text-tunnel-600">{timeline.transplantMonthLabel}</div>
                    </div>
                  </div>
                )}
                {(timeline.transplantDate || timeline.sowIndoorsDate || timeline.directSowDate) && timeline.expectedHarvestStart && (
                  <div className="ml-3.5 w-0.5 h-3 bg-blue-200" />
                )}
                {timeline.harvestMonthLabel && (
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center bg-harvest-100 rounded-lg text-lg">🍅</span>
                    <div>
                      <div className="text-sm font-bold text-harvest-800">Expected Harvest</div>
                      <div className="text-sm text-harvest-600">From {timeline.harvestMonthLabel}</div>
                    </div>
                  </div>
                )}
              </div>

              {timeline.notes.length > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200 space-y-1">
                  {timeline.notes.map((note, i) => (
                    <p key={i} className="text-xs text-blue-500 font-medium">{note}</p>
                  ))}
                </div>
              )}

              <p className="mt-3 text-xs text-blue-400">
                We&apos;ll create task reminders for each step.
              </p>
            </div>
          )}

          {timeline && !hasTimeline && (
            <div className="text-base text-amber-600 font-medium bg-amber-50 px-4 py-3 rounded-2xl border border-amber-200">
              No timing data available for this plant — you can still plan it, but no reminders will be created.
            </div>
          )}

          {/* Variety */}
          <div>
            <label className="block text-base font-semibold text-earth-700 mb-2">Variety (optional)</label>
            <input
              type="text"
              value={variety}
              onChange={e => setVariety(e.target.value)}
              placeholder="e.g. Gardener's Delight"
              className="w-full px-5 py-4 border border-earth-300 rounded-2xl text-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
            />
          </div>

          {/* Bed fraction */}
          <div>
            <label className="block text-base font-semibold text-earth-700 mb-2">
              How Much of the Bed? ({Math.round(remainingSpace * 100)}% room left)
            </label>
            <FractionPicker value={bedFraction} onChange={setBedFraction} maxFraction={remainingSpace} />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-base font-semibold text-earth-700 mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any notes about this planting..."
              className="w-full px-5 py-4 border border-earth-300 rounded-2xl text-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none resize-none"
            />
          </div>

          {error && (
            <div className="text-base font-medium text-red-600 bg-red-50 px-5 py-4 rounded-2xl border border-red-200">{error}</div>
          )}
        </form>

        {/* Submit */}
        <div className="p-5 border-t border-blue-200">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !plantName}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl text-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm active:scale-[0.98]"
          >
            {isSubmitting ? 'Saving...' : '\uD83D\uDCC5 Plan This Planting'}
          </button>
        </div>
      </div>
    </>
  );
}
