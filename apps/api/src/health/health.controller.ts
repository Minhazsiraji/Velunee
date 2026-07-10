import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  getHealth(): Record<string, string> {
    return {
      status: 'ok',
      service: 'velunee-api',
      timestamp: new Date().toISOString(),
    };
  }
}
