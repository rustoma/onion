import { Controller, Get } from '@nestjs/common';
import { OnionScraperService } from '@scraper/onion-scraper.service';

@Controller()
export class OnionScraperController {
  constructor(private readonly onionScraperService: OnionScraperService) {}

  @Get('scrap')
  async scrapByAsinApi() {
    return await this.onionScraperService.scrap();
  }

  @Get('fingerprints')
  async getBrowserFingerprints() {
    return await this.onionScraperService.getBrowserFingerprints();
  }
}
