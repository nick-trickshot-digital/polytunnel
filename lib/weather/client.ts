import { LATITUDE, LONGITUDE } from '@/lib/config';

const LAT = LATITUDE;
const LON = LONGITUDE;

interface CurrentWeather {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  main: string;
}

interface DayForecast {
  date: string;
  dayName: string;
  tempMin: number;
  tempMax: number;
  description: string;
  icon: string;
  main: string;
  pop: number;
  humidity: number;
  windSpeed: number;
}

export interface WeatherData {
  current: CurrentWeather;
  forecast: DayForecast[];
  alerts: WeatherAlert[];
  fetchedAt: string;
}

export interface WeatherAlert {
  type: 'frost' | 'heat' | 'rain' | 'wind' | 'dry';
  severity: 'info' | 'warning' | 'danger';
  message: string;
  icon: string;
}

// In-memory cache
let cachedWeather: WeatherData | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// WMO weather code to description mapping
const wmoDescriptions: Record<number, { description: string; main: string; icon: string }> = {
  0: { description: 'Clear sky', main: 'Clear', icon: '☀️' },
  1: { description: 'Mainly clear', main: 'Clear', icon: '🌤️' },
  2: { description: 'Partly cloudy', main: 'Clouds', icon: '⛅' },
  3: { description: 'Overcast', main: 'Clouds', icon: '☁️' },
  45: { description: 'Foggy', main: 'Fog', icon: '🌫️' },
  48: { description: 'Rime fog', main: 'Fog', icon: '🌫️' },
  51: { description: 'Light drizzle', main: 'Drizzle', icon: '🌦️' },
  53: { description: 'Moderate drizzle', main: 'Drizzle', icon: '🌦️' },
  55: { description: 'Dense drizzle', main: 'Drizzle', icon: '🌧️' },
  61: { description: 'Slight rain', main: 'Rain', icon: '🌧️' },
  63: { description: 'Moderate rain', main: 'Rain', icon: '🌧️' },
  65: { description: 'Heavy rain', main: 'Rain', icon: '🌧️' },
  71: { description: 'Slight snow', main: 'Snow', icon: '🌨️' },
  73: { description: 'Moderate snow', main: 'Snow', icon: '🌨️' },
  75: { description: 'Heavy snow', main: 'Snow', icon: '❄️' },
  80: { description: 'Slight rain showers', main: 'Rain', icon: '🌦️' },
  81: { description: 'Moderate rain showers', main: 'Rain', icon: '🌧️' },
  82: { description: 'Violent rain showers', main: 'Rain', icon: '⛈️' },
  85: { description: 'Slight snow showers', main: 'Snow', icon: '🌨️' },
  86: { description: 'Heavy snow showers', main: 'Snow', icon: '❄️' },
  95: { description: 'Thunderstorm', main: 'Thunderstorm', icon: '⛈️' },
  96: { description: 'Thunderstorm with hail', main: 'Thunderstorm', icon: '⛈️' },
  99: { description: 'Thunderstorm with heavy hail', main: 'Thunderstorm', icon: '⛈️' },
};

function getWmoInfo(code: number) {
  return wmoDescriptions[code] || { description: 'Unknown', main: 'Unknown', icon: '🌤️' };
}

function generateAlerts(forecast: DayForecast[]): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  for (const day of forecast.slice(0, 2)) {
    // Hard frost — genuinely dangerous for tunnel crops
    if (day.tempMin < -2) {
      alerts.push({
        type: 'frost',
        severity: 'danger',
        message: `Hard frost ${day.dayName} (${Math.round(day.tempMin)}°C) — double-fleece everything, protect pipes`,
        icon: '🥶',
      });
    } else if (day.tempMin < 0) {
      alerts.push({
        type: 'frost',
        severity: 'warning',
        message: `Frost ${day.dayName} night (${Math.round(day.tempMin)}°C) — close up and fleece tender plants`,
        icon: '❄️',
      });
    }

    // Extreme heat — tunnel will be much hotter inside
    if (day.tempMax > 32) {
      alerts.push({
        type: 'heat',
        severity: 'danger',
        message: `Extreme heat ${day.dayName} (${Math.round(day.tempMax)}°C) — shade crops, water twice, full ventilation`,
        icon: '🔥',
      });
    }

    // Storm / violent conditions only
    if (day.main === 'Thunderstorm') {
      alerts.push({
        type: 'rain',
        severity: 'warning',
        message: `Thunderstorm expected ${day.dayName} — secure doors, check drainage`,
        icon: '⛈️',
      });
    }

    // Very strong wind — risk to tunnel structure
    if (day.windSpeed > 50) {
      alerts.push({
        type: 'wind',
        severity: 'danger',
        message: `Strong wind ${day.dayName} (${Math.round(day.windSpeed)} km/h) — secure all doors and vents`,
        icon: '💨',
      });
    }
  }

  // Snow in forecast
  for (const day of forecast.slice(0, 3)) {
    if (day.main === 'Snow') {
      alerts.push({
        type: 'frost',
        severity: 'warning',
        message: `Snow forecast ${day.dayName} — clear tunnel roof if it settles, protect crops`,
        icon: '🌨️',
      });
      break;
    }
  }

  // Deduplicate by type
  const seen = new Set<string>();
  return alerts.filter(a => {
    const key = `${a.type}-${a.severity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getWeatherData(): Promise<WeatherData> {
  // Return cached data if fresh enough
  if (cachedWeather && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedWeather;
  }

  try {
    // Fetch current weather and 7-day forecast from Open-Meteo (no API key needed)
    const [currentRes, forecastRes] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Europe/London`
      ),
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,wind_speed_10m_max,relative_humidity_2m_mean&timezone=Europe/London&forecast_days=7`
      ),
    ]);

    const currentData = await currentRes.json();
    const forecastData = await forecastRes.json();

    const currentCode = currentData.current?.weather_code ?? 0;
    const currentWmo = getWmoInfo(currentCode);

    const current: CurrentWeather = {
      temp: currentData.current?.temperature_2m ?? 0,
      feelsLike: currentData.current?.apparent_temperature ?? 0,
      humidity: currentData.current?.relative_humidity_2m ?? 0,
      windSpeed: currentData.current?.wind_speed_10m ?? 0,
      description: currentWmo.description,
      icon: currentWmo.icon,
      main: currentWmo.main,
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daily = forecastData.daily || {};
    const forecast: DayForecast[] = [];

    const dates: string[] = daily.time || [];
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const dayDate = new Date(date + 'T12:00:00');
      const weatherCode = daily.weather_code?.[i] ?? 0;
      const wmo = getWmoInfo(weatherCode);

      forecast.push({
        date,
        dayName: dayNames[dayDate.getDay()],
        tempMin: daily.temperature_2m_min?.[i] ?? 0,
        tempMax: daily.temperature_2m_max?.[i] ?? 0,
        description: wmo.description,
        icon: wmo.icon,
        main: wmo.main,
        pop: daily.precipitation_probability_max?.[i] ?? 0,
        humidity: daily.relative_humidity_2m_mean?.[i] ?? 0,
        windSpeed: daily.wind_speed_10m_max?.[i] ?? 0,
      });
    }

    const alerts = generateAlerts(forecast);

    const weatherData: WeatherData = {
      current,
      forecast: forecast.slice(0, 7),
      alerts,
      fetchedAt: new Date().toISOString(),
    };

    cachedWeather = weatherData;
    cacheTime = Date.now();

    return weatherData;
  } catch (error) {
    console.error('Weather API error:', error);
    return {
      current: {
        temp: 0, feelsLike: 0, humidity: 0, windSpeed: 0,
        description: 'Weather unavailable', icon: '❓', main: 'Unknown',
      },
      forecast: [],
      alerts: [],
      fetchedAt: new Date().toISOString(),
    };
  }
}
