'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { TunnelMap } from '@/components/tunnel-map/TunnelMap';
import type { BedData } from '@/components/tunnel-map/TunnelMap';
import { WeatherAlerts } from '@/components/weather/WeatherAlerts';
import { RecommendationCards } from '@/components/recommendations/RecommendationCards';
import { WhatToPlantNow } from '@/components/suggestions/WhatToPlantNow';
import { AddPlantingModal } from '@/components/planting/AddPlantingModal';
import { PlantIcon } from '@/components/ui/PlantIcon';
import { fractionToNumber } from '@/lib/utils/companions';
import { useToast } from '@/components/ui/Toast';
import { vickieNoTasks, vickieOverdueTasks, vickieHasTasks, haroldHarvestReady, haroldHarvestSoon, haroldNoHarvests, pickQuote } from '@/lib/quotes/vickie';

export default function HomePage() {
  const toast = useToast();
  const [beds, setBeds] = useState<BedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [upcomingTasks, setUpcomingTasks] = useState<Array<{
    id: number;
    title: string;
    dueDate: string | null;
    category: string;
    priority: string;
    isCompleted: boolean;
  }>>([]);
  const [weather, setWeather] = useState<{
    current: { temp: number; description: string; icon: string };
    forecast: Array<{ dayName: string; tempMin: number; tempMax: number; description: string; icon: string; pop: number }>;
  } | null>(null);
  const [plantingModal, setPlantingModal] = useState<{
    bedId: string;
    plantName: string;
    bedFraction: string;
  } | null>(null);

  const fetchBeds = useCallback(() => {
    setLoadError(false);
    fetch('/api/beds')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setBeds(data);
        setLoading(false);
      })
      .catch(() => { setLoading(false); setLoadError(true); });
  }, []);

  const fetchTasks = useCallback(() => {
    fetch('/api/tasks?completed=false')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUpcomingTasks(data.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  const fetchWeather = useCallback(() => {
    fetch('/api/weather')
      .then(res => res.json())
      .then(data => {
        if (data.current) setWeather(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchBeds();
    fetchTasks();
    fetchWeather();
  }, [fetchBeds, fetchTasks, fetchWeather]);

  const handleRefresh = () => {
    fetchBeds();
    fetchTasks();
  };

  const categoryIcons: Record<string, string> = {
    watering: '💧', feeding: '🌱', ventilation: '🌡️', sowing: '🌱',
    harvesting: '🥬', maintenance: '🔧', 'pest-control': '🐛',
  };

  const handleCompleteTask = async (taskId: number) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted: true }),
    });
    toast('Task done!');
    fetchTasks();
  };

  // Action handlers
  const handlePlantAction = (plantName: string, bedId: string, bedFraction: string) => {
    setPlantingModal({ bedId, plantName, bedFraction });
  };

  const handleSeasonalPlantAction = (plantName: string, bedId: string) => {
    setPlantingModal({ bedId, plantName, bedFraction: 'full' });
  };

  const handleTaskAction = async (taskTitle: string, taskCategory: string) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: taskTitle,
        category: taskCategory,
        priority: 'medium',
        isAiGenerated: true,
      }),
    });
    fetchTasks();
  };

  // Compute remaining space for a bed
  const getRemainingSpace = (bedId: string) => {
    const bed = beds.find(b => b.id === bedId);
    if (!bed) return 1;
    const used = bed.plantings
      .filter(p => p.status !== 'finished' && p.status !== 'failed')
      .reduce((sum, p) => sum + fractionToNumber(p.bedFraction), 0);
    return Math.max(0, 1 - used);
  };

  // Dashboard stats
  const activePlantings = beds.flatMap(b => b.plantings.filter(p => p.status !== 'finished' && p.status !== 'failed'));
  const emptyBeds = beds.filter(b => {
    const used = b.plantings
      .filter(p => p.status !== 'finished' && p.status !== 'failed')
      .reduce((sum, p) => sum + fractionToNumber(p.bedFraction), 0);
    return used === 0;
  });
  const today = new Date().toISOString().split('T')[0];
  const in14Days = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

  // All plantings with a harvest date, sorted soonest first
  const allHarvestPlantings = activePlantings
    .filter(p => p.expectedHarvestStart)
    .sort((a, b) => (a.expectedHarvestStart || '').localeCompare(b.expectedHarvestStart || ''));

  // Harvests actually due: ready now or within 14 days
  const harvestsDue = allHarvestPlantings.filter(p => p.expectedHarvestStart! <= in14Days);

  // Upcoming harvests for the list section — next 5
  const upcomingHarvests = allHarvestPlantings.slice(0, 5);

  const overdueTasks = upcomingTasks.filter(t => t.dueDate && t.dueDate < today);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Image
            src="/images/ant.png"
            alt="Ant with his watering can"
            width={160}
            height={160}
            className="w-36 h-36 mx-auto mb-5 animate-bounce object-contain"
            priority
          />
          <p className="text-xl text-earth-500 font-semibold">Loading your tunnel...</p>
        </div>
      </div>
    );
  }

  if (loadError && beds.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center px-6">
          <p className="text-5xl mb-4">😕</p>
          <p className="text-xl font-bold text-earth-700 mb-2">Couldn&apos;t load your tunnel</p>
          <p className="text-base text-earth-500 mb-5">Check your internet connection and try again</p>
          <button
            onClick={fetchBeds}
            className="px-6 py-3 bg-tunnel-600 text-white rounded-2xl text-lg font-bold hover:bg-tunnel-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 md:py-6 space-y-5 md:space-y-4">

      {/* ── Hero header (mobile) ── */}
      <div className="md:hidden flex items-center gap-4">
        <Image
          src="/images/ant-head.png"
          alt="Ant"
          width={56}
          height={56}
          className="w-14 h-14 rounded-full object-cover object-top border-2 border-tunnel-300 bg-earth-50 flex-shrink-0"
        />
        <div>
          <h1 className="text-3xl font-900 text-tunnel-800 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Ant&apos;s Polytunnel
          </h1>
          <p className="text-base text-earth-500 font-semibold mt-0.5">Puttenham, Surrey</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          REAL DATA — What's actually happening
          ═══════════════════════════════════════════════ */}

      {/* ── Quick Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-2">
        <div className="bg-tunnel-600 text-white rounded-2xl p-4 md:p-3 shadow-sm">
          <p className="text-3xl font-800" style={{ fontFamily: 'var(--font-display)' }}>
            {activePlantings.length}
          </p>
          <p className="text-sm md:text-base font-semibold text-tunnel-100 mt-1">Plants Growing</p>
        </div>
        <div className="bg-white rounded-2xl p-4 md:p-3 border border-earth-200 shadow-sm">
          <p className="text-3xl font-800 text-earth-800" style={{ fontFamily: 'var(--font-display)' }}>
            {emptyBeds.length}
          </p>
          <p className="text-sm md:text-base font-semibold text-earth-600 mt-1">Beds Empty</p>
        </div>
        <div className={`rounded-2xl p-4 md:p-3 shadow-sm ${
          harvestsDue.length > 0
            ? 'bg-harvest-50 border-2 border-harvest-400'
            : 'bg-white border border-earth-200'
        }`}>
          <p className={`text-3xl font-800 ${harvestsDue.length > 0 ? 'text-harvest-700' : 'text-earth-800'}`} style={{ fontFamily: 'var(--font-display)' }}>
            {harvestsDue.length}
          </p>
          <p className={`text-sm md:text-base font-semibold mt-1 ${harvestsDue.length > 0 ? 'text-harvest-700' : 'text-earth-600'}`}>
            {harvestsDue.some(p => p.expectedHarvestStart! <= today) ? 'Ready to Pick!' : 'Nearly Ready'}
          </p>
        </div>
        <div className={`rounded-2xl p-4 md:p-3 shadow-sm ${
          overdueTasks.length > 0
            ? 'bg-red-50 border-2 border-red-300'
            : 'bg-white border border-earth-200'
        }`}>
          <p className={`text-3xl font-800 ${overdueTasks.length > 0 ? 'text-red-600' : 'text-earth-800'}`} style={{ fontFamily: 'var(--font-display)' }}>
            {upcomingTasks.length}
          </p>
          <p className={`text-sm md:text-base font-semibold mt-1 ${overdueTasks.length > 0 ? 'text-red-600' : 'text-earth-600'}`}>
            {overdueTasks.length > 0 ? `${overdueTasks.length} Need Doing!` : 'Jobs to Do'}
          </p>
        </div>
      </div>

      {/* ── Weather alerts — extreme conditions only ── */}
      <WeatherAlerts />

      {/* ── Tasks + Harvests: side-by-side on desktop ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-4">
        {/* Tasks */}
        <div className="bg-white rounded-2xl border border-earth-200 p-5 md:p-4 card-texture shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-800 text-earth-800 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
              📋 Tasks
            </h2>
            <Link
              href="/tasks"
              className="text-base font-semibold text-tunnel-600 hover:text-tunnel-700 transition-colors min-h-0"
            >
              View All Tasks
            </Link>
          </div>

          {upcomingTasks.length === 0 ? (
            <div className="flex items-center gap-4">
              <Image
                src="/images/vickie.png"
                alt="Vickie"
                width={96}
                height={96}
                className="w-24 h-24 object-contain flex-shrink-0"
              />
              <div>
                <p className="text-lg font-800 text-earth-700" style={{ fontFamily: 'var(--font-display)' }}>
                  Vickie says...
                </p>
                <p className="text-base text-earth-500 font-semibold mt-1">
                  &ldquo;{pickQuote(vickieNoTasks)}&rdquo;
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-3 px-1">
                <Image
                  src="/images/vickie.png"
                  alt="Vickie"
                  width={80}
                  height={80}
                  className="w-20 h-20 object-contain flex-shrink-0"
                />
                <div>
                  <p className="text-lg font-800 text-earth-700" style={{ fontFamily: 'var(--font-display)' }}>
                    Vickie says...
                  </p>
                  <p className="text-base text-earth-500 font-semibold mt-1 italic">
                    &ldquo;{pickQuote(overdueTasks.length > 0 ? vickieOverdueTasks : vickieHasTasks)}&rdquo;
                  </p>
                </div>
              </div>
              <div className="space-y-2 stagger-children">
              {upcomingTasks.map(task => {
                const isOverdue = task.dueDate && task.dueDate < today;
                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 md:px-3 md:py-2.5 border transition-all animate-fade-in ${
                      isOverdue ? 'border-red-300 bg-red-50/50' :
                      task.priority === 'urgent' ? 'border-red-300 bg-red-50/30' :
                      task.priority === 'high' ? 'border-amber-300 bg-amber-50/30' :
                      'border-earth-200 bg-earth-50'
                    }`}
                  >
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="w-8 h-8 md:w-7 md:h-7 !min-h-0 p-0 rounded-full border-3 border-earth-300 hover:border-tunnel-500 hover:bg-tunnel-50 flex-shrink-0 transition-colors"
                    />
                    <span className="text-2xl md:text-xl flex-shrink-0">
                      {categoryIcons[task.category] || '📌'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-base md:text-sm font-bold text-earth-800 block">
                        {task.title}
                      </span>
                      {task.dueDate && (
                        <span className={`text-sm md:text-xs font-semibold ${isOverdue ? 'text-red-600' : 'text-earth-500'}`}>
                          {isOverdue ? 'Overdue — ' : ''}
                          {new Date(task.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </div>

        {/* Upcoming Harvests */}
        <div className="bg-white rounded-2xl border border-earth-200 p-5 md:p-4 card-texture shadow-sm">
          <h2 className="text-xl font-800 text-earth-800 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            Upcoming Harvests
          </h2>
          {upcomingHarvests.length > 0 ? (
            <>
              <div className="flex items-center gap-4 mb-3">
                <Image
                  src="/images/harold.png"
                  alt="Harold the spaniel"
                  width={96}
                  height={96}
                  className="w-24 h-24 object-contain flex-shrink-0"
                />
                <div>
                  <p className="text-lg font-800 text-earth-700" style={{ fontFamily: 'var(--font-display)' }}>
                    {pickQuote(upcomingHarvests.some(p => p.expectedHarvestStart && p.expectedHarvestStart <= today)
                      ? haroldHarvestReady
                      : haroldHarvestSoon, 1)}
                  </p>
                  <p className="text-base text-earth-500 font-semibold mt-1">
                    {(() => {
                      const first = upcomingHarvests[0];
                      const isReady = first.expectedHarvestStart && first.expectedHarvestStart <= today;
                      if (isReady) {
                        return `"${first.plantName}! They're ready!"`;
                      }
                      const dateStr = new Date(first.expectedHarvestStart + 'T12:00:00').toLocaleDateString('en-GB', { month: 'long' });
                      return `"${first.plantName} should be ready in ${dateStr}!"`;
                    })()}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {upcomingHarvests.map(p => {
                  const isReady = p.expectedHarvestStart && p.expectedHarvestStart <= today;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between gap-3 px-4 py-3 md:px-3 md:py-2.5 rounded-xl border ${
                        isReady ? 'bg-harvest-50 border-harvest-300' : 'bg-earth-50 border-earth-200'
                      }`}
                    >
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <PlantIcon name={p.plantName} size={24} />
                        <span className="text-base md:text-sm font-bold text-earth-800">{p.plantName}</span>
                        {p.variety && (
                          <span className="text-sm md:text-xs text-earth-500 ml-1.5">({p.variety})</span>
                        )}
                        <span className="text-sm md:text-xs text-earth-500 ml-2">{p.bedId}</span>
                      </div>
                      <span className={`text-base md:text-sm font-bold flex-shrink-0 ${isReady ? 'text-harvest-700' : 'text-earth-500'}`}>
                        {isReady
                          ? 'Ready now!'
                          : new Date(p.expectedHarvestStart + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Image
                src="/images/harold.png"
                alt="Harold the spaniel"
                width={96}
                height={96}
                className="w-24 h-24 object-contain flex-shrink-0"
              />
              <div>
                <p className="text-lg font-800 text-earth-700" style={{ fontFamily: 'var(--font-display)' }}>
                  Harold&apos;s waiting...
                </p>
                <p className="text-base text-earth-500 font-semibold mt-1">
                  &ldquo;{pickQuote(haroldNoHarvests, 2)}&rdquo;
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tunnel Map ── */}
      <div>
        <div className="flex items-center justify-between mb-3 md:mb-2">
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/ant-head.png"
              alt="Ant"
              width={36}
              height={36}
              className="w-9 h-9 rounded-full object-cover object-top border-2 border-earth-200 bg-earth-50"
            />
            <h2 className="text-xl font-800 text-earth-800" style={{ fontFamily: 'var(--font-display)' }}>
              Your Tunnel
            </h2>
          </div>
          <span className="text-sm text-earth-500 font-medium">Tap a bed for details</span>
        </div>
        <TunnelMap beds={beds} onRefresh={handleRefresh} />
      </div>

      {/* ── Wally's Daily Report ── */}
      <div className="bg-white rounded-2xl border border-earth-200 card-texture shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 p-5 md:p-4 pb-3 md:pb-2">
          <Image
            src="/images/wally.png"
            alt="Wally the spaniel"
            width={80}
            height={80}
            className="w-20 h-20 object-contain flex-shrink-0"
          />
          <div>
            <p className="text-xl font-800 text-earth-800" style={{ fontFamily: 'var(--font-display)' }}>
              Wally&apos;s Daily Report
            </p>
            <p className="text-sm text-earth-400 font-semibold mt-0.5">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        {/* Report items */}
        <div className="px-5 md:px-4 pb-5 md:pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-2">
            {/* Weather */}
            {weather && (
              <div className="flex items-start gap-3 md:flex-col md:items-center md:text-center bg-earth-50 rounded-xl px-4 py-3 border border-earth-100">
                <span className="text-2xl flex-shrink-0">{weather.current.icon}</span>
                <div>
                  <p className="text-base md:text-sm font-bold text-earth-800">
                    {Math.round(weather.current.temp)}°C, {weather.current.description.toLowerCase()}
                  </p>
                  {weather.forecast.length > 1 && (
                    <p className="text-sm md:text-xs text-earth-500 font-medium mt-0.5">
                      Tomorrow: {Math.round(weather.forecast[1].tempMax)}°C
                      {weather.forecast[1].pop > 40 && `, ${weather.forecast[1].pop}% rain`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tunnel status */}
            <div className="flex items-start gap-3 md:flex-col md:items-center md:text-center bg-tunnel-50 rounded-xl px-4 py-3 border border-tunnel-100">
              <span className="text-2xl flex-shrink-0">🌱</span>
              <div>
                <p className="text-base md:text-sm font-bold text-earth-800">
                  {activePlantings.length} plant{activePlantings.length !== 1 ? 's' : ''} growing
                </p>
                {emptyBeds.length > 0 && (
                  <p className="text-sm md:text-xs font-semibold text-earth-500 mt-0.5">
                    {emptyBeds.length} bed{emptyBeds.length !== 1 ? 's' : ''} empty
                  </p>
                )}
              </div>
            </div>

            {/* Harvests */}
            <div className={`flex items-start gap-3 md:flex-col md:items-center md:text-center rounded-xl px-4 py-3 border ${
              harvestsDue.length > 0 ? 'bg-harvest-50 border-harvest-200' : 'bg-earth-50 border-earth-100'
            }`}>
              <span className="text-2xl flex-shrink-0">🥬</span>
              <div>
                <p className={`text-base md:text-sm font-bold ${harvestsDue.length > 0 ? 'text-harvest-700' : 'text-earth-500'}`}>
                  {harvestsDue.length === 0
                    ? 'No harvests due'
                    : harvestsDue.filter(p => p.expectedHarvestStart! <= today).length > 0
                      ? `${harvestsDue.filter(p => p.expectedHarvestStart! <= today).length} ready to pick!`
                      : `${harvestsDue.length} coming soon`
                  }
                </p>
                {harvestsDue.length > 0 && harvestsDue.length <= 3 && (
                  <p className="text-sm md:text-xs font-semibold text-earth-500 mt-0.5">
                    {harvestsDue.map(p => p.plantName).join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Tasks */}
            <div className={`flex items-start gap-3 md:flex-col md:items-center md:text-center rounded-xl px-4 py-3 border ${
              overdueTasks.length > 0 ? 'bg-red-50 border-red-200' : 'bg-earth-50 border-earth-100'
            }`}>
              <span className="text-2xl flex-shrink-0">📋</span>
              <div>
                <p className="text-base md:text-sm font-bold text-earth-800">
                  {upcomingTasks.length === 0
                    ? <span className="text-earth-500">No tasks</span>
                    : `${upcomingTasks.length} job${upcomingTasks.length !== 1 ? 's' : ''} to do`
                  }
                </p>
                {overdueTasks.length > 0 && (
                  <p className="text-sm md:text-xs font-bold text-red-600 mt-0.5">
                    {overdueTasks.length} overdue!
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Wally's closing observation */}
          <p className="text-sm text-earth-400 font-semibold italic mt-3 md:mt-2 md:text-center">
            {(() => {
              if (overdueTasks.length > 0) return '"Wally noticed those overdue tasks. Even he wouldn\'t leave them that long."';
              if (harvestsDue.some(p => p.expectedHarvestStart! <= today)) return '"Wally\'s been eyeing those ripe ones. Better pick them before he does."';
              if (emptyBeds.length > beds.length / 2) return '"Lots of empty beds. Wally\'s claimed them as napping spots."';
              if (activePlantings.length > 10) return '"Busy tunnel. Wally can barely find a spot to lie down."';
              return '"All quiet. Wally\'s having a nap."';
            })()}
          </p>
        </div>
      </div>

      {/* ── What to Plant Now — prominent when tunnel is mostly empty ── */}
      {emptyBeds.length > beds.length / 2 && (
        <WhatToPlantNow onPlantAction={handleSeasonalPlantAction} />
      )}

      {/* ── Smart Suggestions ── */}
      <div>
        <h2 className="text-xl font-800 text-earth-800 mb-3 md:mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Smart Suggestions
        </h2>
        <RecommendationCards
          onPlantAction={handlePlantAction}
          onTaskAction={handleTaskAction}
        />
      </div>

      {/* ── Planting modal (triggered by recommendation actions) ── */}
      {plantingModal && (
        <AddPlantingModal
          bedId={plantingModal.bedId}
          remainingSpace={getRemainingSpace(plantingModal.bedId)}
          initialPlantName={plantingModal.plantName}
          initialBedFraction={plantingModal.bedFraction}
          onClose={() => setPlantingModal(null)}
          onSuccess={() => {
            setPlantingModal(null);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}
