import { Module } from '@nestjs/common';
import { DbModule } from 'lib/db';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OnionScraperController } from '@scraper/onion-scraper.controller';
import { OnionScraperService } from '@scraper/onion-scraper.service';
import { OnionScraperConsumer } from '@scraper/onion-scraper.process';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    DbModule,
    ConfigModule,
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('QUEUE_HOST'),
          port: configService.get('QUEUE_PORT'),
          password: configService.get('QUEUE_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'scraper',
    }),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'scraper',
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [OnionScraperController],
  providers: [OnionScraperService, OnionScraperConsumer],
})
export class OnionScraperModule {}
