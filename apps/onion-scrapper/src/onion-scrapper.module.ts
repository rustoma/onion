import { Module } from '@nestjs/common';
import { OnionScrapperService } from '@scrapper/onion-scrapper.service';
import { OnionScrapperController } from '@scrapper/onion-scrapper.controller';
import { DbModule } from 'lib/db';

@Module({
  imports: [DbModule],
  controllers: [OnionScrapperController],
  providers: [OnionScrapperService],
})
export class OnionScrapperModule {}
