'use client';

import { useEffect, useState } from 'react';

interface RecommendationAction {
  type: 'plant' | 'task';
  plantName?: string;
  bedId?: string;
  bedFraction?: string;
  taskTitle?: string;
  taskCategory?: string;
}

interface Recommendation {
  title: string;
  detail: string;
  priority: string;
  relatedBeds: string[];
  category: string;
  action?: RecommendationAction;
}

interface RecommendationCardsProps {
  onPlantAction?: (plantName: string, bedId: string, bedFraction: string) => void;
  onTaskAction?: (taskTitle: string, taskCategory: string) => void;
}

const categoryIcons: Record<string, string> = {
  planting: '🌱',
  maintenance: '🔧',
  harvest: '🥬',
  warning: '⚠️',
};

const priorityStyles: Record<string, string> = {
  low: 'bg-earth-50 border-earth-300',
  medium: 'bg-tunnel-50 border-tunnel-300',
  high: 'bg-amber-50 border-amber-300',
};

export function RecommendationCards({ onPlantAction, onTaskAction }: RecommendationCardsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [existingTaskTitles, setExistingTaskTitles] = useState<Set<string>>(new Set());
  const [hiddenTitles, setHiddenTitles] = useState<Set<string>>(new Set());

  const fetchTaskTitles = () => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setExistingTaskTitles(new Set(data.map((t: { title: string }) => t.title.toLowerCase())));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/recommendations').then(res => res.json()),
      fetch('/api/tasks').then(res => res.json()),
    ])
      .then(([recs, tasks]) => {
        if (Array.isArray(recs)) setRecommendations(recs);
        if (Array.isArray(tasks)) {
          setExistingTaskTitles(new Set(tasks.map((t: { title: string }) => t.title.toLowerCase())));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filter out recommendations that already have a matching task
  const visibleRecommendations = recommendations.filter(rec => {
    if (rec.action?.type === 'task' && rec.action.taskTitle) {
      const title = rec.action.taskTitle.toLowerCase();
      if (existingTaskTitles.has(title) || hiddenTitles.has(title)) return false;
    }
    return true;
  });

  const handleAction = (rec: Recommendation, index: number) => {
    if (!rec.action) return;
    if (rec.action.type === 'plant' && onPlantAction && rec.action.plantName && rec.action.bedId) {
      onPlantAction(rec.action.plantName, rec.action.bedId, rec.action.bedFraction || 'full');
    } else if (rec.action.type === 'task' && onTaskAction && rec.action.taskTitle) {
      onTaskAction(rec.action.taskTitle, rec.action.taskCategory || 'maintenance');
      // Immediately hide this suggestion
      setHiddenTitles(prev => new Set(prev).add(rec.action!.taskTitle!.toLowerCase()));
      // Refresh task list so it stays in sync
      fetchTaskTitles();
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 md:space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl md:rounded-xl p-5 md:p-3 border border-earth-200 animate-pulse">
            <div className="h-5 bg-earth-100 rounded-lg w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (visibleRecommendations.length === 0) return null;

  return (
    <div className="space-y-3 md:space-y-2 stagger-children">
      {visibleRecommendations.map((rec, i) => {
        const isOpen = expanded === i;
        return (
          <div
            key={i}
            className={`rounded-2xl md:rounded-xl border animate-fade-in transition-colors ${priorityStyles[rec.priority] || priorityStyles.medium}`}
          >
            {/* Clickable header for expand/collapse */}
            <button
              onClick={() => setExpanded(isOpen ? null : i)}
              className="w-full text-left p-5 md:p-3"
            >
              <div className="flex items-center gap-3 md:gap-2">
                <span className="text-2xl md:text-lg flex-shrink-0">
                  {categoryIcons[rec.category] || '💡'}
                </span>
                <h4 className="flex-1 min-w-0 text-lg md:text-sm font-bold text-earth-900" style={{ fontFamily: 'var(--font-display)' }}>
                  {rec.title}
                </h4>
                <span className={`text-earth-500 text-lg md:text-sm flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                  ▾
                </span>
              </div>
            </button>

            {/* Expanded content */}
            {isOpen && (
              <div className="px-5 pb-5 md:px-3 md:pb-3 pl-14 md:pl-10">
                <p className="text-base md:text-sm text-earth-600 leading-relaxed md:leading-snug">{rec.detail}</p>

                {rec.relatedBeds?.length > 0 && (
                  <div className="flex flex-wrap gap-2 md:gap-1.5 mt-3 md:mt-2">
                    {rec.relatedBeds.map(bed => (
                      <span
                        key={bed}
                        className="inline-flex items-center px-3 md:px-2 py-1 md:py-0.5 rounded-lg text-sm md:text-xs font-semibold bg-white text-earth-700 border border-earth-200"
                      >
                        {bed}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action button */}
                {rec.action && (
                  <div className="mt-4 md:mt-3">
                    {rec.action.type === 'plant' ? (
                      <button
                        onClick={() => handleAction(rec, i)}
                        className="inline-flex items-center gap-2 px-5 py-3 md:px-4 md:py-2 bg-tunnel-600 text-white rounded-xl text-base md:text-sm font-bold hover:bg-tunnel-700 active:scale-[0.97] transition-all shadow-sm"
                      >
                        🌱 Plant {rec.action.plantName} in {rec.action.bedId}
                      </button>
                    ) : rec.action.type === 'task' ? (
                      <button
                        onClick={() => handleAction(rec, i)}
                        className="inline-flex items-center gap-2 px-5 py-3 md:px-4 md:py-2 bg-white text-earth-700 rounded-xl text-base md:text-sm font-semibold hover:bg-earth-50 active:scale-[0.97] transition-all border border-earth-300"
                      >
                        📋 Add as a task
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
