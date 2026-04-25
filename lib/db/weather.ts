/**
 * Weather + heat stress utilities.
 *
 * Uses Open-Meteo (free, no API key required) for current conditions and
 * forecast. Computes THI (Temperature-Humidity Index, NRC 1971) used to
 * categorise heat stress risk for pigs.
 *
 * THI thresholds for pigs:
 *   < 74  Comfort
 *   74–78 Alert (mild stress)
 *   79–83 Danger (moderate to severe)
 *   ≥ 84  Emergency (acute heat stress)
 */

export type ThiCategory = 'comfort' | 'alert' | 'danger' | 'emergency';

export const THI_CATEGORY_LABEL: Record<ThiCategory, string> = {
  comfort: 'Comfort',
  alert: 'Alert',
  danger: 'Danger',
  emergency: 'Emergency',
};

export const THI_CATEGORY_COLOR: Record<ThiCategory, string> = {
  comfort: '#34C759', // emerald
  alert: '#FFD60A', // amber
  danger: '#E85D26', // brand orange
  emergency: '#FF453A', // rose
};

export function computeThi(tempC: number, humidityPct: number): number {
  // NRC 1971 — used in livestock heat stress research
  const tF = 1.8 * tempC + 32;
  return (
    Math.round((tF - (0.55 - 0.0055 * humidityPct) * (tF - 58)) * 10) / 10
  );
}

export function getThiCategory(thi: number): ThiCategory {
  if (thi < 74) return 'comfort';
  if (thi < 79) return 'alert';
  if (thi < 84) return 'danger';
  return 'emergency';
}

// ---------------------------------------------------------------------------
// Weather code → human readable (Open-Meteo's WMO codes)
// ---------------------------------------------------------------------------

const WEATHER_CODE: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Heavy rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm',
};

export function describeWeatherCode(code: number): string {
  return WEATHER_CODE[code] ?? 'Unknown';
}

// ---------------------------------------------------------------------------
// Open-Meteo fetch
// ---------------------------------------------------------------------------

export interface SiteWeather {
  current: {
    timestamp: string;
    temp_c: number;
    humidity: number;
    wind_kph: number;
    weather_code: number;
    weather_label: string;
    is_day: boolean;
    thi: number;
    thi_category: ThiCategory;
  };
  forecast_48h: {
    hour: string;
    temp_c: number;
    humidity: number;
    thi: number;
    thi_category: ThiCategory;
  }[];
  // First future hour predicted to be in alert+ category (heat stress warning)
  heat_stress_warning: {
    expected_at: string;
    expected_thi: number;
    expected_category: ThiCategory;
    hours_from_now: number;
  } | null;
}

export async function fetchSiteWeather(
  latitude: number,
  longitude: number,
  timezone: string,
): Promise<SiteWeather | null> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day',
  );
  url.searchParams.set(
    'hourly',
    'temperature_2m,relative_humidity_2m,weather_code',
  );
  url.searchParams.set('forecast_days', '2');
  url.searchParams.set('timezone', timezone || 'auto');
  url.searchParams.set('wind_speed_unit', 'kmh');

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 900 }, // 15 min cache
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OpenMeteoResponse;

    if (!data.current || !data.hourly) return null;

    const c = data.current;
    const currentThi = computeThi(c.temperature_2m, c.relative_humidity_2m);

    const forecast: SiteWeather['forecast_48h'] = [];
    const now = Date.now();
    let warning: SiteWeather['heat_stress_warning'] = null;

    const hours = data.hourly.time ?? [];
    const temps = data.hourly.temperature_2m ?? [];
    const humidities = data.hourly.relative_humidity_2m ?? [];

    for (let i = 0; i < hours.length; i++) {
      const t = temps[i];
      const h = humidities[i];
      if (typeof t !== 'number' || typeof h !== 'number') continue;
      const thi = computeThi(t, h);
      const cat = getThiCategory(thi);
      const hour = hours[i]!;
      forecast.push({
        hour,
        temp_c: t,
        humidity: h,
        thi,
        thi_category: cat,
      });

      // First future hour where THI is alert+
      if (
        !warning &&
        new Date(hour).getTime() > now &&
        (cat === 'alert' ||
          cat === 'danger' ||
          cat === 'emergency')
      ) {
        const hoursFromNow = Math.round(
          (new Date(hour).getTime() - now) / 3_600_000,
        );
        warning = {
          expected_at: hour,
          expected_thi: thi,
          expected_category: cat,
          hours_from_now: hoursFromNow,
        };
      }
    }

    return {
      current: {
        timestamp: c.time,
        temp_c: c.temperature_2m,
        humidity: c.relative_humidity_2m,
        wind_kph: c.wind_speed_10m,
        weather_code: c.weather_code,
        weather_label: describeWeatherCode(c.weather_code),
        is_day: c.is_day === 1,
        thi: currentThi,
        thi_category: getThiCategory(currentThi),
      },
      forecast_48h: forecast,
      heat_stress_warning: warning,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Open-Meteo response shape (subset we use)
// ---------------------------------------------------------------------------

interface OpenMeteoResponse {
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    is_day: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    relative_humidity_2m?: number[];
    weather_code?: number[];
  };
}
