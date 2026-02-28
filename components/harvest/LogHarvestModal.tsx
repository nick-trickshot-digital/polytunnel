'use client';

import { useState } from 'react';
import type { PlantingData } from '@/components/tunnel-map/TunnelMap';
import { useModal } from '@/lib/hooks/useModal';
import { useToast } from '@/components/ui/Toast';

interface LogHarvestModalProps {
  planting: PlantingData;
  onClose: () => void;
  onSuccess: () => void;
}

export function LogHarvestModal({ planting, onClose, onSuccess }: LogHarvestModalProps) {
  useModal(onClose);
  const toast = useToast();
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [dateHarvested, setDateHarvested] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/harvests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantingId: planting.id,
          dateHarvested,
          quantity: quantity || null,
          notes: notes || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to log harvest');
      toast('Harvest logged!');
      onSuccess();
    } catch (err) {
      console.error(err);
      setError('Failed to save — check your connection and try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[70] backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Log a harvest" className="fixed inset-x-4 top-[15%] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md z-[71] bg-white rounded-2xl shadow-2xl overflow-hidden border border-earth-200 animate-slide-up">
        <div className="p-5 border-b border-earth-200 bg-tunnel-50">
          <h2
            className="text-2xl font-extrabold text-earth-800"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Record a Harvest
          </h2>
          <p className="text-base text-earth-500 font-semibold mt-0.5">
            {planting.plantName}{planting.variety ? ` (${planting.variety})` : ''}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-base font-semibold text-earth-700 mb-2">When did you pick it?</label>
            <input
              type="date"
              value={dateHarvested}
              onChange={e => setDateHarvested(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-5 py-4 border border-earth-300 rounded-2xl text-lg focus:ring-2 focus:ring-tunnel-300 focus:border-tunnel-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-base font-semibold text-earth-700 mb-2">How much did you pick?</label>
            <input
              type="text"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder='e.g. "2kg", "a handful", "12 fruits"'
              className="w-full px-5 py-4 border border-earth-300 rounded-2xl text-lg focus:ring-2 focus:ring-tunnel-300 focus:border-tunnel-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-base font-semibold text-earth-700 mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any notes about this harvest..."
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
              {isSubmitting ? 'Saving...' : '\uD83E\uDD6C Save Harvest'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
