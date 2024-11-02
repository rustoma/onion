import { Injectable } from '@nestjs/common';

@Injectable()
export class OnionScrapperService {
  getHello(): string {
    return 'Hello World!';
  }
}
