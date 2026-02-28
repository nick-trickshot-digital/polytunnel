'use client';

import { useState, useRef, useEffect } from 'react';
import { PlantIcon } from '@/components/ui/PlantIcon';

interface PlantEntry {
  name: string;
  icon: string;
}

interface PlantSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function PlantSelector({ value, onChange }: PlantSelectorProps) {
  const [plants, setPlants] = useState<PlantEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/plants')
      .then(res => res.json())
      .then((data: PlantEntry[]) => {
        if (Array.isArray(data)) setPlants(data);
      })
      .catch(() => {});
  }, []);

  const filtered = plants.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const selected = plants.find(p => p.name === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="w-full px-5 py-4 border-2 border-earth-200 rounded-2xl text-lg focus-within:ring-2 focus-within:ring-tunnel-300 focus-within:border-tunnel-400 flex items-center gap-3 cursor-pointer"
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        {value && <PlantIcon name={value} fallback={selected?.icon} size={28} />}
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : value}
          onChange={e => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search or type a plant name..."
          className="flex-1 outline-none bg-transparent text-lg"
        />
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
              setSearch('');
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-earth-100 hover:bg-earth-200 text-earth-500 text-lg font-bold transition-colors"
          >
            {'\u2715'}
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-earth-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto z-10">
          {filtered.map(plant => (
            <button
              key={plant.name}
              onClick={() => {
                onChange(plant.name);
                setSearch('');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-5 py-4 text-lg text-left hover:bg-tunnel-50 transition-colors border-b border-earth-100 last:border-0 font-medium"
            >
              <PlantIcon name={plant.name} fallback={plant.icon} size={28} />
              <span>{plant.name}</span>
            </button>
          ))}
          {filtered.length === 0 && search && (
            <button
              onClick={() => {
                onChange(search);
                setSearch('');
                setIsOpen(false);
              }}
              className="w-full px-5 py-4 text-lg text-left text-tunnel-600 hover:bg-tunnel-50 font-bold"
            >
              Use &quot;{search}&quot; as custom plant
            </button>
          )}
        </div>
      )}
    </div>
  );
}
