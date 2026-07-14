import { Controller, Get } from '@nestjs/common';
import type { SystemConfig } from '@velunee/contracts';
import { API_VERSION, APP_NAME, APP_TAGLINE } from '@velunee/shared';
import { Public } from '../common/decorators/public.decorator';

@Controller('system')
export class SystemController {
  @Public()
  @Get('config')
  getConfig(): SystemConfig {
    return {
      appName: APP_NAME,
      tagline: APP_TAGLINE,
      apiVersion: API_VERSION,
      maintenanceMode: false,
      minimumMobileVersion: '0.1.0',
      features: {
        chat: true,
        voice: false,
        imageAdvice: false,
        community: true,
        memory: true,
        balance: true,
      },
    };
  }
}
