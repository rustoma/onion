import { Injectable } from '@nestjs/common';

@Injectable()
export class OnionApiService {
  getHello(): string {
    return 'Hello World!';
  }
}
