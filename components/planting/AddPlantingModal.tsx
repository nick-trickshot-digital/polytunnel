'use client';

import { useState, useEffect } from 'react';
import { FractionPicker } from './FractionPicker';
import { PlantSelector } from './PlantSelector';
import { useModal } from '@/lib/hooks/useModal';
import { useToast } from '@/components/ui/Toast';

interface AddPlantingModalProps {
  bedId: string;
  remainingSpace: number;
  onClose: () => void;
  onSuccess: () => void;
  initialPlantName?: string;
  initialBedFraction?: string;
}

export function AddPlantingModal({ bedId, remainingSpace, onClose, onSuccess, initialPlantName, initialBedFraction }: AddPlantingModalProps) {
  useModal(onClose);
  const toast = useToast();
  const [plantName, setPlantName] = useState(initialPlantName || '');
  const [variety, setVariety] = useState('');
  const [datePlanted, setDatePlanted] = useState(new Date().toISOString().split('T')[0]);
  const [dateSown, setDateSown] = useState('');
  const [bedFraction, setBedFraction] = useState(initialBedFraction || 'full');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [companionInfo, setCompanionInfo] = useState<{ good: string[]; bad: string[] } | null>(null);
  const [rotationCheck, setRotationCheck] = useState<{ family: string; consecutiveYears: number; message: string } | null>(null);

  // Check companion planting and rotation when plant is selected
  useEffect(() => {
    if (!plantName) {
      setCompanionInfo(null);
      setRotationCheck(null);
      return;
    }

    fetch(`/api/beds/${bedId}?checkCompanions=${encodeURIComponent(plantName)}&checkRotation=${encodeURIComponent(plantName)}`)
      .then(res => res.json())
      .then(data => {
        if (data.companions) {
          setCompanionInfo(data.companions);
        }
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
          datePlanted,
          dateSown: dateSown || null,
          bedFraction,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add planting');
      }

      toast(`${plantName} planted!`);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Record a new plant" className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:max-h-[90vh] z-[61] bg-white md:rounded-2xl shadow-2xl flex flex-col overflow-hidden md:border border-earth-200 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-earth-200 bg-tunnel-50">
          <div>
            <h2
              className="text-2xl font-extrabold text-earth-800"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Record a New Plant
            </h2>
            <p className="text-base text-earth-500 font-semibold mt-0.5">Bed {bedId}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-12 h-12 flex items-center justify-center rounded-full bg-earth-100 hover:bg-earth-200 text-earth-500 text-xl font-bold transition-colors"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Plant selector */}
          <div>
            <label className="block text-base font-semibold text-earth-700 mb-2">Plant *</label>
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

          {/* Variety */}
          <div>
            <label className="block text-base font-semibold text-earth-700 mb-2">Variety (optional)</label>
            <input
              type="text"
              value={variety}
              onChange={e => setVariety(e.target.value)}
              placeholder="e.g. Gardener's Delight"
              className="w-full px-5 py-4 border border-earth-300 rounded-2xl text-lg focus:ring-2 focus:ring-tunnel-300 focus:border-tunnel-400 outline-none"
            />
          </div>

          {/* Date planted */}
          <div>
            <label className="block text-base font-semibold text-earth-700 mb-2">Date Planted *</label>
            <input
              type="date"
              value={datePlanted}
              onChange={e => setDatePlanted(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-5 py-4 border border-earth-300 rounded-2xl text-lg focus:ring-2 focus:ring-tunnel-300 focus:border-tunnel-400 outline-none"
            />
          </div>

          {/* Date sown */}
          <div>
            <label className="block text-base font-semibold text-earth-700 mb-2">Date Sown (optional)</label>
            <input
              type="date"
              value={dateSown}
              onChange={e => setDateSown(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-5 py-4 border border-earth-300 rounded-2xl text-lg focus:ring-2 focus:ring-tunnel-300 focus:border-tunnel-400 outline-none"
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
              className="w-full px-5 py-4 border border-earth-300 rounded-2xl text-lg focus:ring-2 focus:ring-tunnel-300 focus:border-tunnel-400 outline-none resize-none"
            />
          </div>

          {error && (
            <div className="text-base font-medium text-red-600 bg-red-50 px-5 py-4 rounded-2xl border border-red-200">{error}</div>
          )}
        </form>

        {/* Submit */}
        <div className="p-5 border-t border-earth-200">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !plantName}
            className="w-full py-4 bg-tunnel-600 text-white rounded-2xl text-lg font-bold hover:bg-tunnel-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm active:scale-[0.98]"
          >
            {isSubmitting ? 'Saving...' : '\uD83C\uDF31 Save This Plant'}
          </button>
        </div>
      </div>
    </>
  );
}
