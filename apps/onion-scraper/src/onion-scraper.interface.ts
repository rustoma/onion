import { Query } from '@prisma/client';
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

export interface ScrapJob {
  query: Query;
}

export interface HandleAsinDeal {
  deal: Deal;
  priceAlert?: number | null;
}

export enum NOTIFY_TYPE {
  priceAlert = 'priceAlert',
  deal = 'deal',
}

export interface Notify {
  name: string;
  price: number;
  url: string;
  type: NOTIFY_TYPE;
}
