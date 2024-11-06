import { Controller, Get } from '@nestjs/common';
import { OnionScrapperService } from './onion-scrapper.service';

@Controller()
export class OnionScrapperController {
  constructor(private readonly onionScrapperService: OnionScrapperService) {}

  @Get('scrap-asin')
  async scrapByAsinApi() {
    return await this.onionScrapperService.scrapByAsinApi();
  }

  @Get('scrap-keywords')
  async scrapByKeywordApi() {
    return await this.onionScrapperService.scrapByKeywordApi();
  }
}
