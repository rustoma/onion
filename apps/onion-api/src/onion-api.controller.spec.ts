import { Test, TestingModule } from '@nestjs/testing';
import { OnionApiController } from './onion-api.controller';
import { OnionApiService } from './onion-api.service';

describe('OnionApiController', () => {
  let onionApiController: OnionApiController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [OnionApiController],
      providers: [OnionApiService],
    }).compile();

    onionApiController = app.get<OnionApiController>(OnionApiController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(onionApiController.getHello()).toBe('Hello World!');
    });
  });
});
