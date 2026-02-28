'use client';

import { fractionToNumber } from '@/lib/utils/companions';

const fractions = ['1/4', '1/3', '1/2', '2/3', '3/4', 'full'] as const;

interface FractionPickerProps {
  value: string;
  onChange: (value: string) => void;
  maxFraction: number;
}

export function FractionPicker({ value, onChange, maxFraction }: FractionPickerProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {fractions.map(f => {
        const numValue = fractionToNumber(f);
        const isDisabled = numValue > maxFraction + 0.01;
        const isSelected = value === f;

        return (
          <button
            key={f}
            type="button"
            onClick={() => !isDisabled && onChange(f)}
            disabled={isDisabled}
            className={`
              relative px-5 py-3 rounded-2xl text-base font-bold transition-all border-2
              ${isSelected
                ? 'bg-tunnel-500 text-white border-tunnel-600 shadow-md'
                : isDisabled
                  ? 'bg-earth-50 text-earth-300 border-earth-100 cursor-not-allowed'
                  : 'bg-white text-earth-600 border-earth-200 hover:border-tunnel-300 hover:text-tunnel-600'
              }
            `}
          >
            {/* Visual fraction bar */}
            <div className="w-12 h-2.5 bg-earth-200 rounded-full mb-1.5 overflow-hidden mx-auto">
              <div
                className={`h-full rounded-full transition-all ${
                  isSelected ? 'bg-white' : isDisabled ? 'bg-earth-300' : 'bg-tunnel-400'
                }`}
                style={{ width: `${numValue * 100}%` }}
              />
            </div>
            {f}
          </button>
        );
      })}
    </div>
  );
}
