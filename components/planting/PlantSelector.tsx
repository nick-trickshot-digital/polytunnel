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
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
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

  const handleCreateWithAI = async () => {
    if (!search.trim() || isCreating) return;
    setIsCreating(true);
    setCreateError('');

    try {
      const res = await fetch('/api/plants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantName: search.trim() }),
      });

      const data = await res.json();

      if (res.status === 409) {
        onChange(data.plant?.name || search.trim());
        setSearch('');
        setIsOpen(false);
        setIsCreating(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create plant');
      }

      const plantName = data.plant?.name || search.trim();
      setPlants(prev => [...prev, { name: plantName, icon: '\uD83C\uDF31' }].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(plantName);
      setSearch('');
      setIsOpen(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsCreating(false);
    }
  };

  const noResults = filtered.length === 0 && search.length > 0;

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
            setCreateError('');
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
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-earth-200 rounded-2xl shadow-xl max-h-72 overflow-y-auto z-10">
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

          {noResults && (
            <div className="p-4 space-y-3">
              <button
                onClick={() => {
                  onChange(search);
                  setSearch('');
                  setIsOpen(false);
                }}
                className="w-full px-5 py-4 text-lg text-left text-earth-600 hover:bg-earth-50 font-medium rounded-xl border border-earth-200 transition-colors"
              >
                Use &quot;{search}&quot; as custom name
              </button>

              <button
                onClick={handleCreateWithAI}
                disabled={isCreating}
                className="w-full px-5 py-4 text-lg text-left text-tunnel-700 bg-tunnel-50 hover:bg-tunnel-100 font-bold rounded-xl border-2 border-tunnel-200 transition-colors disabled:opacity-60"
              >
                {isCreating ? (
                  <span className="flex items-center gap-3">
                    <span className="inline-block w-5 h-5 border-2 border-tunnel-400 border-t-transparent rounded-full animate-spin" />
                    Looking up {search}...
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <span className="text-xl">{'\u2728'}</span>
                    Add &quot;{search}&quot; to plant database
                  </span>
                )}
              </button>

              {isCreating && (
                <p className="text-sm text-earth-400 font-medium px-2">
                  Fetching growing data and image — this takes a few seconds
                </p>
              )}

              {createError && (
                <p className="text-sm text-red-600 font-medium px-2">{createError}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
