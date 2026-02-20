/** Open-Meteo 天気取得（API キー不要） */
const DEFAULT_LAT = 35.6762;
const DEFAULT_LON = 139.6503;

const DESC_MAP: Record<number, string> = {
  0: '晴れ', 1: 'ほぼ晴れ', 2: '晴れ時々曇り', 3: '曇り',
  45: '霧', 48: '霧', 51: '小雨', 61: '雨', 80: 'にわか雨', 95: '雷雨',
};

export interface WeatherInfo {
  temp: number;
  desc: string;
  weatherCode?: number;
}

export async function fetchWeather(lat = DEFAULT_LAT, lon = DEFAULT_LON): Promise<WeatherInfo | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=Asia%2FTokyo`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { current?: { temperature_2m?: number; weather_code?: number } };
    const temp = data.current?.temperature_2m ?? 0;
    const code = data.current?.weather_code ?? 0;
    return { temp, desc: DESC_MAP[code] ?? `天候コード${code}`, weatherCode: code };
  } catch (e) {
    console.error('weather fetch error:', e);
    return null;
  }
}
