import { Module } from '@nestjs/common';
import { OnionScrapperController } from './onion-scrapper.controller';
import { OnionScrapperService } from './onion-scrapper.service';

@Module({
  imports: [],
  controllers: [OnionScrapperController],
  providers: [OnionScrapperService],
})
export class OnionScrapperModule {}
