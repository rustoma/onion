import { Test, TestingModule } from '@nestjs/testing';
import { OnionScrapperController } from '@scrapper/onion-scrapper.controller';
import { OnionScrapperService } from '@scrapper/onion-scrapper.service';

describe('OnionScrapperController', () => {
  let onionScrapperController: OnionScrapperController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [OnionScrapperController],
      providers: [OnionScrapperService],
    }).compile();

    onionScrapperController = app.get<OnionScrapperController>(
      OnionScrapperController,
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(onionScrapperController.scrap()).toBe('Hello World!');
    });
  });
});
