import { NestFactory } from '@nestjs/core';
import { OnionScrapperModule } from './onion-scrapper.module';

async function bootstrap() {
  const app = await NestFactory.create(OnionScrapperModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
