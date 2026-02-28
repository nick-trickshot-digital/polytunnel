'use client';

import { useEffect, useState } from 'react';
import type { WeatherData } from '@/lib/weather/client';

export function WeatherBar() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/weather')
      .then(res => res.json())
      .then(data => {
        setWeather(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border-2 border-earth-200 animate-pulse card-texture">
        <div className="h-10 bg-earth-100 rounded-xl w-40 mb-3" />
        <div className="h-5 bg-earth-100 rounded-lg w-56" />
      </div>
    );
  }

  if (!weather || weather.current.main === 'Unknown') {
    return (
      <div className="bg-white rounded-2xl p-6 border-2 border-earth-200 text-lg text-earth-400 font-semibold">
        Weather data unavailable
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-earth-200 overflow-hidden card-texture shadow-sm">
      {/* Current weather */}
      <div className="p-5 md:p-6 flex items-center gap-4">
        <span className="text-5xl md:text-6xl drop-shadow-sm">{weather.current.icon}</span>
        <div className="flex-1">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-4xl md:text-5xl font-extrabold text-earth-900" style={{ fontFamily: 'var(--font-display)' }}>
              {Math.round(weather.current.temp)}°C
            </span>
            <span className="text-lg text-earth-500 font-semibold capitalize">
              {weather.current.description}
            </span>
          </div>
          <div className="flex items-center gap-4 text-base text-earth-500 mt-1 font-semibold">
            <span>Feels {Math.round(weather.current.feelsLike)}°</span>
            <span>💧 {weather.current.humidity}%</span>
            <span>💨 {Math.round(weather.current.windSpeed)}km/h</span>
          </div>
        </div>
      </div>

      {/* Forecast strip */}
      {weather.forecast.length > 0 && (
        <div className="border-t-2 border-earth-100 px-3 py-3 flex gap-1 overflow-x-auto">
          {weather.forecast.slice(0, 7).map((day, i) => (
            <div
              key={day.date}
              className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-center min-w-[64px] ${
                i === 0 ? 'bg-tunnel-50 border-2 border-tunnel-200' : ''
              }`}
            >
              <span className="text-xs font-extrabold text-earth-600 uppercase">
                {i === 0 ? 'Today' : day.dayName.slice(0, 3)}
              </span>
              <span className="text-2xl">{day.icon}</span>
              <div className="text-sm font-bold">
                <span className="text-earth-800">{Math.round(day.tempMax)}°</span>
                <span className="text-earth-400 ml-1">{Math.round(day.tempMin)}°</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
