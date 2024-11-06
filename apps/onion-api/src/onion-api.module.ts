import { Module } from '@nestjs/common';
import { OnionApiController } from '@api/onion-api.controller';
import { OnionApiService } from '@api/onion-api.service';

@Module({
  imports: [],
  controllers: [OnionApiController],
  providers: [OnionApiService],
})
export class OnionApiModule {}
