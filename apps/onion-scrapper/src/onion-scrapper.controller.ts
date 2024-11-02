import { Controller, Get } from '@nestjs/common';
import { OnionScrapperService } from './onion-scrapper.service';

@Controller()
export class OnionScrapperController {
  constructor(private readonly onionScrapperService: OnionScrapperService) {}

  @Get()
  getHello(): string {
    return this.onionScrapperService.getHello();
  }
}
