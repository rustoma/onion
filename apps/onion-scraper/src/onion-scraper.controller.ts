import { Controller, Get } from '@nestjs/common';
import { OnionScraperService } from '@scraper/onion-scraper.service';

@Controller()
export class OnionScraperController {
  constructor(private readonly onionScraperService: OnionScraperService) {}

  @Get('scrap-asin')
  async scrapByAsinApi() {
    return await this.onionScraperService.handleScrapByAsin();
  }

  @Get('scrap-keywords')
  async scrapByKeywordApi() {
    return await this.onionScraperService.handleScrapByKeyword();
  }
}
