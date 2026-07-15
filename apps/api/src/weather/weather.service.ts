import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface WeatherApiCurrentResponse {
  location?: { name?: string; region?: string };
  current?: {
    temp_c?: number;
    feelslike_c?: number;
    humidity?: number;
    wind_kph?: number;
    condition?: { text?: string };
    precip_mm?: number;
    uv?: number;
  };
}

export interface WeatherSnapshot {
  locationName: string;
  temperatureC: number;
  feelsLikeC: number | null;
  condition: string | null;
  precipMm: number | null;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly apiKey: string | undefined;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('WEATHER_API_KEY') || undefined;
  }

  get enabled(): boolean {
    return Boolean(this.apiKey);
  }

  private async fetchCurrent(
    latitude: number,
    longitude: number,
  ): Promise<WeatherApiCurrentResponse | null> {
    if (!this.apiKey) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const url =
        `https://api.weatherapi.com/v1/current.json?key=${encodeURIComponent(this.apiKey)}` +
        `&q=${latitude},${longitude}&aqi=no`;

      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        this.logger.warn(`WeatherAPI responded ${response.status}`);
        return null;
      }

      return (await response.json()) as WeatherApiCurrentResponse;
    } catch (error) {
      this.logger.warn(
        `Weather lookup failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Structured current conditions for UI cards. Fails soft: returns null on
   * any problem so the home screen renders without a weather card.
   */
  async getSnapshot(latitude: number, longitude: number): Promise<WeatherSnapshot | null> {
    const data = await this.fetchCurrent(latitude, longitude);
    const current = data?.current;
    if (!data || !current || typeof current.temp_c !== 'number') return null;

    return {
      locationName: data.location?.name ?? 'your area',
      temperatureC: Math.round(current.temp_c),
      feelsLikeC: typeof current.feelslike_c === 'number' ? Math.round(current.feelslike_c) : null,
      condition: current.condition?.text ?? null,
      precipMm: typeof current.precip_mm === 'number' ? current.precip_mm : null,
    };
  }

  /**
   * Fetch current conditions and return a short instruction the model can use
   * to give weather-aware advice. Fails soft: returns null on any problem so a
   * weather outage never blocks a chat reply.
   */
  async getContext(latitude: number, longitude: number): Promise<string | null> {
    try {
      const data = await this.fetchCurrent(latitude, longitude);
      const current = data?.current;
      if (!data || !current || typeof current.temp_c !== 'number') return null;

      const place = data.location?.name ?? 'the user location';
      const parts = [
        `Current weather near ${place}:`,
        `${Math.round(current.temp_c)}°C`,
        current.condition?.text ? `(${current.condition.text})` : '',
        typeof current.feelslike_c === 'number'
          ? `feels like ${Math.round(current.feelslike_c)}°C`
          : '',
        typeof current.humidity === 'number' ? `humidity ${current.humidity}%` : '',
        typeof current.wind_kph === 'number' ? `wind ${Math.round(current.wind_kph)} kph` : '',
        typeof current.precip_mm === 'number' ? `precipitation ${current.precip_mm} mm` : '',
      ].filter(Boolean);

      return (
        `${parts.join(' ')}. ` +
        'When relevant to the user request (going out, plans, what to wear, ' +
        'whether to carry an umbrella), use this to give practical, ' +
        'weather-aware advice. Do not mention the weather if it is not relevant.'
      );
    } catch (error) {
      this.logger.warn(
        `Weather context failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    }
  }
}
