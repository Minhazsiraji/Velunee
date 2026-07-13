import type { ConfigService } from '@nestjs/config';
import { WeatherService } from './weather.service';

function buildConfig(key?: string): ConfigService {
  return { get: jest.fn().mockReturnValue(key) } as unknown as ConfigService;
}

describe('WeatherService', () => {
  it('is disabled and returns no context without an API key', async () => {
    const service = new WeatherService(buildConfig(undefined));

    expect(service.enabled).toBe(false);
    await expect(service.getContext(23.8, 90.4)).resolves.toBeNull();
  });

  it('reports enabled when a key is configured', () => {
    const service = new WeatherService(buildConfig('test-key'));

    expect(service.enabled).toBe(true);
  });
});
