import { NextResponse } from 'next/server';
import { getWeatherData } from '@/lib/weather/client';

export async function GET() {
  try {
    const weather = await getWeatherData();
    return NextResponse.json(weather);
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 });
  }
}
