import { NestFactory } from '@nestjs/core';
import { OnionApiModule } from '@api/onion-api.module';

async function bootstrap() {
  const app = await NestFactory.create(OnionApiModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
