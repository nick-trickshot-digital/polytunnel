'use client';

import { useState } from 'react';
import type { PlantingData } from '@/components/tunnel-map/TunnelMap';
import { daysSince } from '@/lib/utils/dates';
import { useModal } from '@/lib/hooks/useModal';
import { useToast } from '@/components/ui/Toast';
import { PlantIcon } from '@/components/ui/PlantIcon';

interface FinishPlantingModalProps {
  planting: PlantingData;
  onClose: () => void;
  onSuccess: () => void;
}

export function FinishPlantingModal({ planting, onClose, onSuccess }: FinishPlantingModalProps) {
  useModal(onClose);
  const toast = useToast();
  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/plantings/${planting.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'finished',
          successRating: rating || null,
          finishNotes: notes || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to finish planting');
      toast(rating ? `Finished & rated ${rating}/5!` : 'Cleared from bed');
      onSuccess();
    } catch (err) {
      console.error(err);
      setError('Failed to save — check your connection and try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  const grewDays = planting.datePlanted ? daysSince(planting.datePlanted) : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[70] backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Finish planting" className="fixed inset-x-4 top-[15%] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md z-[71] bg-white rounded-2xl shadow-2xl overflow-hidden border border-earth-200 animate-slide-up">
        <div className="p-5 border-b border-earth-200 bg-earth-50">
          <h2
            className="text-2xl font-extrabold text-earth-800"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Finish & Rate
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <PlantIcon name={planting.plantName} size={24} />
            <span className="text-base text-earth-600 font-semibold">
              {planting.plantName}{planting.variety ? ` (${planting.variety})` : ''} · Bed {planting.bedId}
            </span>
          </div>
          {grewDays !== null && (
            <p className="text-sm text-earth-500 font-medium mt-1">
              Grew for {grewDays} days
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Star rating */}
          <div>
            <label className="block text-base font-semibold text-earth-700 mb-3">How did this crop do?</label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? 0 : star)}
                  className="transition-transform active:scale-90"
                  aria-label={`Rate ${star} out of 5`}
                >
                  <span className={`text-5xl ${star <= rating ? 'opacity-100' : 'opacity-25'}`}>
                    {'\u2B50'}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-earth-500 font-medium mt-2">
              {rating === 0 && 'Tap a star to rate (optional)'}
              {rating === 1 && 'Poor — barely produced'}
              {rating === 2 && 'Disappointing — below expectations'}
              {rating === 3 && 'Decent — average results'}
              {rating === 4 && 'Good — solid harvest'}
              {rating === 5 && 'Excellent — bumper crop!'}
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-base font-semibold text-earth-700 mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any notes? Pest issues, great variety, would grow again..."
              className="w-full px-5 py-4 border border-earth-300 rounded-2xl text-lg focus:ring-2 focus:ring-tunnel-300 focus:border-tunnel-400 outline-none resize-none"
            />
          </div>

          {error && (
            <div className="text-base font-medium text-red-600 bg-red-50 px-5 py-4 rounded-2xl border border-red-200">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-5 border border-earth-300 text-earth-600 rounded-2xl text-lg font-semibold hover:bg-earth-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-4 px-5 bg-tunnel-600 text-white rounded-2xl text-lg font-bold hover:bg-tunnel-700 disabled:opacity-50 transition-colors shadow-sm active:scale-[0.98]"
            >
              {isSubmitting ? 'Saving...' : '\u2713 Finish & Rate'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
