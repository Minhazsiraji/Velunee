import { Module } from '@nestjs/common';
import { StyleController } from './style.controller';
import { StyleRepository } from './style.repository';
import { StyleService } from './style.service';

@Module({
  controllers: [StyleController],
  providers: [StyleService, StyleRepository],
})
export class StyleModule {}
