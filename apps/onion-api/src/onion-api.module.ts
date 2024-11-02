import { Module } from '@nestjs/common';
import { OnionApiController } from './onion-api.controller';
import { OnionApiService } from './onion-api.service';

@Module({
  imports: [],
  controllers: [OnionApiController],
  providers: [OnionApiService],
})
export class OnionApiModule {}
