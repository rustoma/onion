import { Injectable } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { SCRAPER_JOBS } from '@scraper/onion-scraper.consts';
import { DbService } from 'lib/db';
import { Query } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class OnionScraperService {
  private DEFAULT_JOB_OPTIONS: JobsOptions = {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  };

  constructor(
    @InjectQueue('scraper') private readonly scraperQueue: Queue,
    private db: DbService,
  ) {}

  async getQueries() {
    return this.db.query.findMany();
  }

  async scrapQuery(query: Query) {
    const { asin, keyword } = query;

    if (asin) {
      return this.handleScrapByAsin(query);
    }

    if (keyword) {
      return this.handleScrapByKeyword(query);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async scrap() {
    const queries = await this.getQueries();
    queries.forEach(this.scrapQuery.bind(this));
  }

  async handleScrapByKeyword(query: Query) {
    await this.scraperQueue.add(
      SCRAPER_JOBS.scrapByKeyword,
      { query },
      this.DEFAULT_JOB_OPTIONS,
    );

    console.log(`${SCRAPER_JOBS.scrapByKeyword} added to the queue`);
  }

  async handleScrapByAsin(query: Query) {
    await this.scraperQueue.add(
      SCRAPER_JOBS.scrapByAsin,
      { query },
      this.DEFAULT_JOB_OPTIONS,
    );

    console.log(`${SCRAPER_JOBS.scrapByAsin} added to the queue`);
  }

  async getBrowserFingerprints() {
    await this.scraperQueue.add(
      SCRAPER_JOBS.getBrowserFingerprints,
      {},
      this.DEFAULT_JOB_OPTIONS,
    );

    console.log(`${SCRAPER_JOBS.getBrowserFingerprints} added to the queue`);
  }
}
