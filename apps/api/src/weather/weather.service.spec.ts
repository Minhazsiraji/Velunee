import { WeatherService } from './weather.service';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

/**
 * Route mocked fetch by URL: Open-Meteo for conditions, BigDataCloud for the
 * place name.
 */
function mockFetch(handlers: { meteo?: unknown; meteoOk?: boolean; geocode?: unknown }): jest.Mock {
  return jest.fn((input: string | URL) => {
    const url = String(input);
    if (url.includes('open-meteo.com')) {
      return Promise.resolve(jsonResponse(handlers.meteo, handlers.meteoOk ?? true));
    }
    return Promise.resolve(jsonResponse(handlers.geocode ?? {}));
  });
}

describe('WeatherService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('is always enabled (Open-Meteo needs no key)', () => {
    expect(new WeatherService().enabled).toBe(true);
  });

  it('returns a snapshot with mapped condition and place name', async () => {
    global.fetch = mockFetch({
      meteo: {
        current: {
          temperature_2m: 30.4,
          apparent_temperature: 33.1,
          precipitation: 0,
          weather_code: 61,
          relative_humidity_2m: 70,
          wind_speed_10m: 12,
        },
      },
      geocode: { city: 'Dhaka' },
    }) as unknown as typeof fetch;

    const snapshot = await new WeatherService().getSnapshot(23.8, 90.4);

    expect(snapshot).toEqual({
      locationName: 'Dhaka',
      temperatureC: 30,
      feelsLikeC: 33,
      condition: 'Light rain',
      precipMm: 0,
    });
  });

  it('builds weather context text including the temperature', async () => {
    global.fetch = mockFetch({
      meteo: {
        current: { temperature_2m: 25, apparent_temperature: 25, weather_code: 0 },
      },
      geocode: { locality: 'Gulshan' },
    }) as unknown as typeof fetch;

    const context = await new WeatherService().getContext(23.8, 90.4);

    expect(context).toContain('Gulshan');
    expect(context).toContain('25°C');
    expect(context).toContain('Clear sky');
  });

  it('returns null when the weather upstream is unavailable', async () => {
    global.fetch = mockFetch({ meteo: {}, meteoOk: false }) as unknown as typeof fetch;

    await expect(new WeatherService().getContext(23.8, 90.4)).resolves.toBeNull();
    await expect(new WeatherService().getSnapshot(23.8, 90.4)).resolves.toBeNull();
  });
});
