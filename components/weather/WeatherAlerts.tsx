'use client';

import { useEffect, useState } from 'react';
import type { WeatherAlert } from '@/lib/weather/client';

export function WeatherAlerts() {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);

  useEffect(() => {
    fetch('/api/weather/alerts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAlerts(data);
      })
      .catch(() => {});
  }, []);

  if (alerts.length === 0) return null;

  const severityStyles = {
    info: 'bg-blue-50 border-blue-300 text-blue-900',
    warning: 'bg-amber-50 border-amber-400 text-amber-900',
    danger: 'bg-red-50 border-red-400 text-red-900',
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 px-5 py-4 rounded-2xl border-2 ${severityStyles[alert.severity]} animate-fade-in`}
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <span className="text-2xl flex-shrink-0 mt-0.5">{alert.icon}</span>
          <p className="text-base font-semibold leading-relaxed">{alert.message}</p>
        </div>
      ))}
    </div>
  );
}
