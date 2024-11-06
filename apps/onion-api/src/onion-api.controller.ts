import { Controller, Get } from '@nestjs/common';
import { OnionApiService } from '@api/onion-api.service';

@Controller()
export class OnionApiController {
  constructor(private readonly onionApiService: OnionApiService) {}

  @Get()
  getHello(): string {
    return this.onionApiService.getHello();
  }
}
