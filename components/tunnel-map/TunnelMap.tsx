'use client';

import { useState, useEffect } from 'react';
import { Bed } from './Bed';
import { BedDetailPanel } from './BedDetailPanel';

export interface PlantingData {
  id: number;
  bedId: string;
  plantName: string;
  variety: string | null;
  datePlanted: string | null;
  dateSown: string | null;
  expectedHarvestStart: string | null;
  expectedHarvestEnd: string | null;
  bedFraction: string;
  status: string;
  notes: string | null;
  plannedSowDate: string | null;
  plannedTransplantDate: string | null;
}

export interface BedData {
  id: string;
  column: string;
  position: number;
  widthMm: number;
  lengthMm: number;
  plantings: PlantingData[];
}

interface TunnelMapProps {
  beds: BedData[];
  onRefresh?: () => void;
}

export function TunnelMap({ beds, onRefresh }: TunnelMapProps) {
  const [selectedBed, setSelectedBed] = useState<BedData | null>(null);

  // Keep selectedBed in sync when beds data refreshes
  useEffect(() => {
    if (selectedBed) {
      const updated = beds.find(b => b.id === selectedBed.id);
      if (updated) setSelectedBed(updated);
    }
  }, [beds]);

  const leftBeds = beds.filter(b => b.column === 'left').sort((a, b) => a.position - b.position);
  const middleBeds = beds.filter(b => b.column === 'middle').sort((a, b) => a.position - b.position);
  const rightBeds = beds.filter(b => b.column === 'right').sort((a, b) => a.position - b.position);

  // Portrait (mobile): position 1 nearest entrance at bottom
  const leftReversed = [...leftBeds].reverse();
  const middleReversed = [...middleBeds].reverse();
  const rightReversed = [...rightBeds].reverse();

  const handleSelect = (bed: BedData) => setSelectedBed(bed);

  return (
    <>
      {/* ── Mobile: Portrait layout ── */}
      <div className="md:hidden w-full max-w-xs mx-auto">
        <div className="text-center mb-1.5">
          <span className="text-[10px] font-semibold text-earth-300 uppercase tracking-widest">Back</span>
        </div>

        <div className="flex gap-1">
          <div className="flex flex-col gap-1 flex-[700]">
            {leftReversed.map(bed => (
              <Bed key={bed.id} bed={bed} onClick={() => handleSelect(bed)} isSelected={selectedBed?.id === bed.id} />
            ))}
          </div>
          <div className="w-1.5 bg-earth-200/60 rounded-full flex-shrink-0" />
          <div className="flex flex-col gap-1 flex-[1380]">
            {middleReversed.map(bed => (
              <Bed key={bed.id} bed={bed} onClick={() => handleSelect(bed)} isSelected={selectedBed?.id === bed.id} />
            ))}
          </div>
          <div className="w-1.5 bg-earth-200/60 rounded-full flex-shrink-0" />
          <div className="flex flex-col gap-1 flex-[700]">
            {rightReversed.map(bed => (
              <Bed key={bed.id} bed={bed} onClick={() => handleSelect(bed)} isSelected={selectedBed?.id === bed.id} />
            ))}
          </div>
        </div>

        <div className="text-center mt-1.5">
          <span className="text-[10px] font-semibold text-earth-300 uppercase tracking-widest">Entrance</span>
        </div>
      </div>

      {/* ── Desktop: Landscape layout ── */}
      {/* Beds run left (entrance) to right (back). Rows = left/middle/right columns. */}
      <div className="hidden md:flex items-center gap-2 w-full">
        {/* Entrance label */}
        <span className="text-[10px] font-semibold text-earth-300 uppercase tracking-widest flex-shrink-0 -rotate-90 origin-center">
          Entrance
        </span>

        {/* Rows — heights proportional to physical column widths */}
        <div className="flex-1 flex flex-col gap-1">
          {/* Left row (700mm wide physically → shorter row) */}
          <div className="flex gap-1" style={{ height: 60 }}>
            {leftBeds.map(bed => (
              <Bed key={bed.id} bed={bed} onClick={() => handleSelect(bed)} isSelected={selectedBed?.id === bed.id} landscape />
            ))}
          </div>
          {/* Path */}
          <div className="h-1 bg-earth-200/60 rounded-full" />
          {/* Middle row (1380mm wide physically → taller row) */}
          <div className="flex gap-1" style={{ height: 120 }}>
            {middleBeds.map(bed => (
              <Bed key={bed.id} bed={bed} onClick={() => handleSelect(bed)} isSelected={selectedBed?.id === bed.id} landscape />
            ))}
          </div>
          {/* Path */}
          <div className="h-1 bg-earth-200/60 rounded-full" />
          {/* Right row (700mm wide physically → shorter row) */}
          <div className="flex gap-1" style={{ height: 60 }}>
            {rightBeds.map(bed => (
              <Bed key={bed.id} bed={bed} onClick={() => handleSelect(bed)} isSelected={selectedBed?.id === bed.id} landscape />
            ))}
          </div>
        </div>

        {/* Back label */}
        <span className="text-[10px] font-semibold text-earth-300 uppercase tracking-widest flex-shrink-0 -rotate-90 origin-center">
          Back
        </span>
      </div>

      {/* Bed detail panel */}
      {selectedBed && (
        <BedDetailPanel
          bed={selectedBed}
          onClose={() => setSelectedBed(null)}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}
