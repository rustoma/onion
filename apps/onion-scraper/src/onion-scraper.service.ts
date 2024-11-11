import { Injectable } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { SCRAPER_JOBS } from '@scraper/onion-scraper.consts';

@Injectable()
export class OnionScraperService {
  private DEFAULT_JOB_OPTIONS: JobsOptions = {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  };

  constructor(@InjectQueue('scraper') private readonly scraperQueue: Queue) {}

  async handleScrapByKeyword() {
    await this.scraperQueue.add(
      SCRAPER_JOBS.scrapByKeyword,
      {},
      this.DEFAULT_JOB_OPTIONS,
    );

    console.log(`${SCRAPER_JOBS.scrapByKeyword} added to the queue`);
  }

  async handleScrapByAsin() {
    await this.scraperQueue.add(
      SCRAPER_JOBS.scrapByAsin,
      {},
      this.DEFAULT_JOB_OPTIONS,
    );

    console.log(`${SCRAPER_JOBS.scrapByAsin} added to the queue`);
  }
}
