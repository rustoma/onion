import { NestFactory } from '@nestjs/core';
import { OnionScraperModule } from '@scraper/onion-scraper.module';

async function bootstrap() {
  const app = await NestFactory.create(OnionScraperModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
