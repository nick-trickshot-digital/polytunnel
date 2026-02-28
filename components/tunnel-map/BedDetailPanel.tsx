'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BedData, PlantingData } from './TunnelMap';
import { daysSince, daysUntil, formatDateUK, formatDateShort } from '@/lib/utils/dates';
import { fractionToNumber } from '@/lib/utils/companions';
import { useModal } from '@/lib/hooks/useModal';
import { useToast } from '@/components/ui/Toast';
import { AddPlantingModal } from '@/components/planting/AddPlantingModal';
import { PlanPlantingModal } from '@/components/planting/PlanPlantingModal';
import { LogHarvestModal } from '@/components/harvest/LogHarvestModal';
import { FinishPlantingModal } from '@/components/planting/FinishPlantingModal';
import { PlantIcon } from '@/components/ui/PlantIcon';

interface BedDetailPanelProps {
  bed: BedData;
  onClose: () => void;
  onRefresh?: () => void;
}

export function BedDetailPanel({ bed, onClose, onRefresh }: BedDetailPanelProps) {
  const [showAddPlanting, setShowAddPlanting] = useState(false);
  const [showPlanPlanting, setShowPlanPlanting] = useState(false);
  const [showLogHarvest, setShowLogHarvest] = useState<PlantingData | null>(null);
  const [showFinishPlanting, setShowFinishPlanting] = useState<PlantingData | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const toast = useToast();

  // Only close on Escape if no sub-modal is open
  const handleClose = useCallback(() => {
    if (!showAddPlanting && !showPlanPlanting && !showLogHarvest && !showFinishPlanting) onClose();
  }, [showAddPlanting, showPlanPlanting, showLogHarvest, showFinishPlanting, onClose]);
  useModal(handleClose);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deletingPlanting, setDeletingPlanting] = useState<number | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [rotationWarnings, setRotationWarnings] = useState<Array<{ family: string; consecutiveYears: number; message: string }>>([]);

  // Fetch rotation warnings on mount
  useEffect(() => {
    fetch(`/api/beds/${bed.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.rotationWarnings) setRotationWarnings(data.rotationWarnings);
      })
      .catch(() => {});
  }, [bed.id]);



  const visiblePlantings = bed.plantings.filter(p => !deletedIds.has(p.id));
  const activePlantings = visiblePlantings.filter(p => p.status !== 'finished' && p.status !== 'failed');
  const growingPlantings = activePlantings.filter(p => p.status !== 'planned');
  const plannedPlantings = activePlantings.filter(p => p.status === 'planned');
  const pastPlantings = visiblePlantings.filter(p => p.status === 'finished' || p.status === 'failed');
  const totalUsed = activePlantings.reduce((sum, p) => sum + fractionToNumber(p.bedFraction), 0);
  const remainingSpace = Math.max(0, 1 - totalUsed);

  const handleDeletePlanting = async (plantingId: number) => {
    setDeletingPlanting(plantingId);
    try {
      const res = await fetch(`/api/plantings/${plantingId}`, { method: 'DELETE' });
      if (!res.ok) {
        console.error('Failed to delete planting:', res.status, await res.text());
        return;
      }
      setConfirmDelete(null);
      setDeletedIds(prev => new Set(prev).add(plantingId));
      onRefresh?.();
    } catch (err) {
      console.error('Failed to delete planting:', err);
    } finally {
      setDeletingPlanting(null);
    }
  };

  const handleStatusChange = async (plantingId: number, newStatus: string) => {
    setUpdatingStatus(plantingId);
    try {
      await fetch(`/api/plantings/${plantingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      onRefresh?.();
      const label = newStatus === 'harvesting' ? 'Marked as ready to pick' :
                     newStatus === 'growing' ? 'Back to growing' :
                     newStatus === 'finished' ? 'Cleared from bed' : 'Updated';
      toast(label);
    } catch (err) {
      console.error('Failed to update planting status:', err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div role="dialog" aria-modal="true" aria-label={`Bed ${bed.id} details`} className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-0 md:right-0 md:left-auto md:w-[480px] z-50 bg-white rounded-t-3xl md:rounded-none md:rounded-l-3xl shadow-2xl max-h-[85vh] md:max-h-screen md:h-screen flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-earth-200 bg-tunnel-50">
          <div>
            <h2 className="text-2xl font-800 text-tunnel-800" style={{ fontFamily: 'var(--font-display)' }}>
              Bed {bed.id}
            </h2>
            <p className="text-base text-earth-600 font-medium mt-0.5">
              {bed.widthMm}mm × {bed.lengthMm}mm · {bed.column} column
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-12 h-12 flex items-center justify-center rounded-full bg-earth-100 hover:bg-earth-200 text-earth-500 text-xl font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
          {/* Space indicator */}
          <div>
            <div className="flex items-center justify-between text-base mb-2">
              <span className="text-earth-600 font-medium">Bed space</span>
              <span className="font-bold text-earth-700">
                {Math.round(totalUsed * 100)}% planted · {Math.round(remainingSpace * 100)}% room left
              </span>
            </div>
            <div className="h-4 bg-earth-100 rounded-full overflow-hidden border border-earth-200">
              <div
                className="h-full bg-tunnel-400 rounded-full transition-all duration-300"
                style={{ width: `${totalUsed * 100}%` }}
              />
            </div>
          </div>

          {/* Rotation warnings */}
          {rotationWarnings.length > 0 && (
            <div className="space-y-2">
              {rotationWarnings.map(w => (
                <div key={w.family} className="text-base bg-amber-50 text-amber-800 px-4 py-3 rounded-2xl border border-amber-200 font-medium">
                  {'\u26A0\uFE0F'} {w.message}
                </div>
              ))}
            </div>
          )}

          {/* Current plantings */}
          {growingPlantings.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-earth-800 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                What&apos;s in This Bed
              </h3>
              <div className="space-y-3">
                {growingPlantings.map(p => (
                  <div key={p.id} className="bg-earth-50 rounded-2xl p-4 border border-earth-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <PlantIcon name={p.plantName} size={28} />
                          <span className="font-bold text-lg text-earth-900">
                            {p.plantName}
                          </span>
                        {p.variety && (
                          <span className="text-base text-earth-600 ml-2">
                            ({p.variety})
                          </span>
                        )}
                        </div>
                        {p.datePlanted && (
                        <div className="flex items-center gap-2 mt-2 text-base text-earth-600 font-medium">
                          <span>Planted {formatDateUK(p.datePlanted)}</span>
                          <span>·</span>
                          <span>{daysSince(p.datePlanted)} days ago</span>
                        </div>
                        )}
                        {p.expectedHarvestStart && (
                          <div className="mt-1 text-base font-semibold text-harvest-700">
                            {daysUntil(p.expectedHarvestStart) > 0
                              ? `Harvest expected: ${formatDateShort(p.expectedHarvestStart)} (${daysUntil(p.expectedHarvestStart)} days)`
                              : `Harvest ready now!`}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                            p.status === 'growing' ? 'bg-tunnel-100 text-tunnel-700 border border-tunnel-200' :
                            p.status === 'harvesting' ? 'bg-harvest-100 text-harvest-700 border border-harvest-200' :
                            'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}>
                            {p.status === 'growing' ? '🌱 Growing' : p.status === 'harvesting' ? '🥬 Ready to Pick' : p.status}
                          </span>
                          <span className="text-sm text-earth-500 font-medium">{p.bedFraction} bed</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-3 border-t border-earth-200 space-y-3">
                      {/* Update status */}
                      {p.status === 'growing' && (
                        <div>
                          <button
                            onClick={() => handleStatusChange(p.id, 'harvesting')}
                            disabled={updatingStatus === p.id}
                            className="w-full text-sm px-4 py-3 bg-harvest-100 text-harvest-800 rounded-xl hover:bg-harvest-200 transition-colors font-semibold border border-harvest-300"
                          >
                            🥬 Mark as Ready to Pick
                          </button>
                          <p className="text-xs text-earth-400 mt-1 text-center">Crop is mature enough to start harvesting</p>
                        </div>
                      )}
                      {p.status === 'harvesting' && (
                        <div>
                          <button
                            onClick={() => handleStatusChange(p.id, 'growing')}
                            disabled={updatingStatus === p.id}
                            className="w-full text-sm px-4 py-3 bg-tunnel-50 text-tunnel-700 rounded-xl hover:bg-tunnel-100 transition-colors font-semibold border border-tunnel-200"
                          >
                            🌱 Not Ready Yet — Back to Growing
                          </button>
                        </div>
                      )}

                      {/* Log a harvest */}
                      <div>
                        <button
                          onClick={() => setShowLogHarvest(p)}
                          className="w-full text-sm px-4 py-3 bg-white text-tunnel-700 rounded-xl hover:bg-tunnel-50 transition-colors font-semibold border border-tunnel-300"
                        >
                          📝 Log a Harvest
                        </button>
                        <p className="text-xs text-earth-400 mt-1 text-center">Record what you picked today (weight, notes)</p>
                      </div>

                      {/* Finish / remove */}
                      {(p.status === 'growing' || p.status === 'harvesting') && (
                        <div>
                          <button
                            onClick={() => setShowFinishPlanting(p)}
                            disabled={updatingStatus === p.id}
                            className="w-full text-sm px-4 py-3 bg-white text-earth-600 rounded-xl hover:bg-earth-50 transition-colors font-semibold border border-earth-300"
                          >
                            {'\u2713'} Finished — Rate & Clear
                          </button>
                          <p className="text-xs text-earth-400 mt-1 text-center">Crop is done — rate how it went and free up the bed</p>
                        </div>
                      )}

                      {/* Delete record */}
                      <button
                        onClick={() => confirmDelete === p.id ? handleDeletePlanting(p.id) : setConfirmDelete(p.id)}
                        disabled={deletingPlanting === p.id}
                        className={`w-full text-xs py-1.5 transition-colors font-medium ${
                          confirmDelete === p.id
                            ? 'text-red-600 hover:text-red-700'
                            : 'text-earth-400 hover:text-red-500'
                        }`}
                      >
                        {deletingPlanting === p.id
                          ? 'Deleting...'
                          : confirmDelete === p.id
                            ? 'Are you sure? Tap again to permanently delete'
                            : 'Delete this planting record'}
                      </button>
                    </div>

                    {p.notes && (
                      <p className="mt-3 text-base text-earth-500 italic">{p.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Planned plantings */}
          {plannedPlantings.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-blue-700 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                Planned for This Bed
              </h3>
              <div className="space-y-3">
                {plannedPlantings.map(p => (
                  <div key={p.id} className="bg-blue-50/50 rounded-2xl p-4 border-2 border-dashed border-blue-300">
                    <div className="flex items-center gap-2">
                      <PlantIcon name={p.plantName} size={28} />
                      <span className="font-bold text-lg text-blue-900">{p.plantName}</span>
                      {p.variety && <span className="text-base text-blue-600">({p.variety})</span>}
                      <span className="text-sm text-blue-500 font-medium ml-auto">{p.bedFraction} bed</span>
                    </div>

                    {/* Timeline */}
                    <div className="mt-3 flex items-center gap-2 text-sm font-medium flex-wrap">
                      {p.plannedSowDate && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg">
                          🌱 Sow: {formatDateShort(p.plannedSowDate)}
                        </span>
                      )}
                      {p.plannedSowDate && p.plannedTransplantDate && (
                        <span className="text-blue-300">→</span>
                      )}
                      {p.plannedTransplantDate && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg">
                          🌿 Plant out: {formatDateShort(p.plannedTransplantDate)}
                        </span>
                      )}
                      {(p.plannedSowDate || p.plannedTransplantDate) && p.expectedHarvestStart && (
                        <span className="text-blue-300">→</span>
                      )}
                      {p.expectedHarvestStart && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-harvest-100 text-harvest-700 rounded-lg">
                          🍅 Harvest: {formatDateShort(p.expectedHarvestStart)}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-3 pt-3 border-t border-blue-200 flex gap-2">
                      <button
                        onClick={() => handleStatusChange(p.id, 'growing')}
                        disabled={updatingStatus === p.id}
                        className="flex-1 text-sm px-4 py-2.5 bg-tunnel-600 text-white rounded-xl hover:bg-tunnel-700 transition-colors font-semibold"
                      >
                        I&apos;ve Planted It
                      </button>
                      <button
                        onClick={() => confirmDelete === p.id ? handleDeletePlanting(p.id) : setConfirmDelete(p.id)}
                        disabled={deletingPlanting === p.id}
                        className={`text-sm px-4 py-2.5 rounded-xl transition-colors font-semibold border ${
                          confirmDelete === p.id
                            ? 'bg-red-50 text-red-600 border-red-300'
                            : 'bg-white text-earth-500 border-earth-300 hover:text-red-500 hover:border-red-300'
                        }`}
                      >
                        {deletingPlanting === p.id ? '...' : confirmDelete === p.id ? 'Confirm?' : 'Cancel Plan'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {growingPlantings.length === 0 && plannedPlantings.length === 0 && (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">🌱</div>
              <p className="text-xl font-bold text-earth-600">Nothing planted here yet</p>
              <p className="text-base text-earth-500 mt-1">Add a plant or plan a future planting</p>
            </div>
          )}

          {/* Past plantings */}
          {pastPlantings.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-earth-700 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                Previously Grown Here
              </h3>
              <div className="space-y-2">
                {pastPlantings.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 text-base text-earth-600 border-b border-earth-100 last:border-0">
                    <span className="font-semibold flex items-center gap-2"><PlantIcon name={p.plantName} size={22} />{p.plantName}{p.variety ? ` (${p.variety})` : ''}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.datePlanted && <span className="font-semibold">{formatDateUK(p.datePlanted)}</span>}
                      {confirmDelete === p.id ? (
                        <button
                          onClick={() => handleDeletePlanting(p.id)}
                          disabled={deletingPlanting === p.id}
                          className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
                        >
                          {deletingPlanting === p.id ? 'Deleting...' : 'Confirm?'}
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(p.id)}
                          className="text-sm font-medium text-earth-400 hover:text-red-500 transition-colors"
                          title="Delete this record"
                        >
                          {'\u2715'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="p-5 border-t border-earth-200 space-y-3">
          <button
            onClick={() => setShowAddPlanting(true)}
            className="w-full py-4 bg-tunnel-600 text-white rounded-2xl text-lg font-bold hover:bg-tunnel-700 transition-colors shadow-sm active:scale-[0.98]"
          >
            🌱 Add a Plant to This Bed
          </button>
          <button
            onClick={() => setShowPlanPlanting(true)}
            className="w-full py-3 bg-white text-blue-700 rounded-2xl text-base font-bold hover:bg-blue-50 transition-colors border-2 border-dashed border-blue-300 active:scale-[0.98]"
          >
            📅 Plan a Future Planting
          </button>
        </div>
      </div>

      {/* Modals */}
      {showAddPlanting && (
        <AddPlantingModal
          bedId={bed.id}
          remainingSpace={remainingSpace}
          onClose={() => setShowAddPlanting(false)}
          onSuccess={() => {
            setShowAddPlanting(false);
            onRefresh?.();
          }}
        />
      )}

      {showPlanPlanting && (
        <PlanPlantingModal
          bedId={bed.id}
          remainingSpace={remainingSpace}
          onClose={() => setShowPlanPlanting(false)}
          onSuccess={() => {
            setShowPlanPlanting(false);
            onRefresh?.();
          }}
        />
      )}

      {showLogHarvest && (
        <LogHarvestModal
          planting={showLogHarvest}
          onClose={() => setShowLogHarvest(null)}
          onSuccess={() => {
            setShowLogHarvest(null);
            onRefresh?.();
          }}
        />
      )}

      {showFinishPlanting && (
        <FinishPlantingModal
          planting={showFinishPlanting}
          onClose={() => setShowFinishPlanting(null)}
          onSuccess={() => {
            setShowFinishPlanting(null);
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}
