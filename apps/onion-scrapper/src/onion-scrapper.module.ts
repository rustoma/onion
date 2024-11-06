import { Module } from '@nestjs/common';
import { OnionScrapperService } from '@scrapper/onion-scrapper.service';
import { OnionScrapperController } from '@scrapper/onion-scrapper.controller';
import { DbModule } from 'lib/db';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot(), DbModule, HttpModule],
  controllers: [OnionScrapperController],
  providers: [OnionScrapperService],
})
export class OnionScrapperModule {}
