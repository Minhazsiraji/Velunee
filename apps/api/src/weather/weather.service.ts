import { Injectable, Logger } from '@nestjs/common';

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
}

interface ReverseGeocodeResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
}

export interface WeatherSnapshot {
  locationName: string;
  temperatureC: number;
  feelsLikeC: number | null;
  condition: string | null;
  precipMm: number | null;
}

/**
 * WMO weather interpretation codes (Open-Meteo `weather_code`) mapped to short,
 * human-readable conditions. Kept intentionally simple; the text is also matched
 * by home.service's rain detection (rain/drizzle/thunder/shower).
 */
function describeWeatherCode(code: number | undefined): string | null {
  if (typeof code !== 'number') return null;
  const map: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Rime fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Heavy drizzle',
    56: 'Freezing drizzle',
    57: 'Heavy freezing drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    66: 'Freezing rain',
    67: 'Heavy freezing rain',
    71: 'Light snow',
    73: 'Snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Light rain showers',
    81: 'Rain showers',
    82: 'Violent rain showers',
    85: 'Light snow showers',
    86: 'Snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Thunderstorm with heavy hail',
  };
  return map[code] ?? null;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  /**
   * Open-Meteo needs no API key, so the weather feature is always available.
   * Retained for callers that gate on availability.
   */
  get enabled(): boolean {
    return true;
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        this.logger.warn(`Weather upstream responded ${response.status}`);
        return null;
      }
      return (await response.json()) as T;
    } catch (error) {
      this.logger.warn(
        `Weather lookup failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private fetchCurrent(latitude: number, longitude: number): Promise<OpenMeteoResponse | null> {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,' +
      'weather_code,wind_speed_10m&timezone=auto';
    return this.fetchJson<OpenMeteoResponse>(url);
  }

  /**
   * Best-effort place name for the coordinates via BigDataCloud's keyless
   * reverse-geocode endpoint. Never throws; returns null so weather still works.
   */
  private async fetchPlaceName(latitude: number, longitude: number): Promise<string | null> {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}` +
      `&longitude=${longitude}&localityLanguage=en`;
    const data = await this.fetchJson<ReverseGeocodeResponse>(url);
    if (!data) return null;
    return data.city || data.locality || data.principalSubdivision || null;
  }

  /**
   * Structured current conditions for UI cards. Fails soft: returns null on
   * any problem so the home screen renders without a weather card.
   */
  async getSnapshot(latitude: number, longitude: number): Promise<WeatherSnapshot | null> {
    const [data, placeName] = await Promise.all([
      this.fetchCurrent(latitude, longitude),
      this.fetchPlaceName(latitude, longitude),
    ]);

    const current = data?.current;
    if (!data || !current || typeof current.temperature_2m !== 'number') return null;

    return {
      locationName: placeName ?? 'your area',
      temperatureC: Math.round(current.temperature_2m),
      feelsLikeC:
        typeof current.apparent_temperature === 'number'
          ? Math.round(current.apparent_temperature)
          : null,
      condition: describeWeatherCode(current.weather_code),
      precipMm: typeof current.precipitation === 'number' ? current.precipitation : null,
    };
  }

  /**
   * Fetch current conditions and return a short instruction the model can use
   * to give weather-aware advice. Fails soft: returns null on any problem so a
   * weather outage never blocks a chat reply.
   */
  async getContext(latitude: number, longitude: number): Promise<string | null> {
    const [data, placeName] = await Promise.all([
      this.fetchCurrent(latitude, longitude),
      this.fetchPlaceName(latitude, longitude),
    ]);

    const current = data?.current;
    if (!data || !current || typeof current.temperature_2m !== 'number') return null;

    const place = placeName ?? 'the user location';
    const condition = describeWeatherCode(current.weather_code);
    const parts = [
      `Current weather near ${place}:`,
      `${Math.round(current.temperature_2m)}°C`,
      condition ? `(${condition})` : '',
      typeof current.apparent_temperature === 'number'
        ? `feels like ${Math.round(current.apparent_temperature)}°C`
        : '',
      typeof current.relative_humidity_2m === 'number'
        ? `humidity ${Math.round(current.relative_humidity_2m)}%`
        : '',
      typeof current.wind_speed_10m === 'number'
        ? `wind ${Math.round(current.wind_speed_10m)} kph`
        : '',
      typeof current.precipitation === 'number' ? `precipitation ${current.precipitation} mm` : '',
    ].filter(Boolean);

    return (
      `${parts.join(' ')}. ` +
      'When relevant to the user request (going out, plans, what to wear, ' +
      'whether to carry an umbrella), use this to give practical, ' +
      'weather-aware advice. Do not mention the weather if it is not relevant.'
    );
  }
}
