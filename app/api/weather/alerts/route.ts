import { NextResponse } from 'next/server';
import { getWeatherData } from '@/lib/weather/client';

export async function GET() {
  try {
    const weather = await getWeatherData();
    return NextResponse.json(weather.alerts);
  } catch (error) {
    console.error('Weather alerts error:', error);
    return NextResponse.json({ error: 'Failed to fetch weather alerts' }, { status: 500 });
  }
}
