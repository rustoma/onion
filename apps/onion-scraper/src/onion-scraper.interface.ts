import { SCRAPER_JOBS } from '@scraper/onion-scraper.consts';

export interface PriceData {
  domain: string;
  value: number;
  url: string;
}

export interface Product {
  title: string;
  asin: string;
  image: string;
  prices: PriceData[];
}

export interface Deal {
  title: string;
  asin: string;
  image: string;
  price: Omit<PriceData, 'domain'>;
}

type ScraperJobKeys = keyof typeof SCRAPER_JOBS;
export type ScraperJobNames = (typeof SCRAPER_JOBS)[ScraperJobKeys];
