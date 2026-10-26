import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const PORT = process.env.PORT ?? 3000;
  await app.listen(PORT);
  console.log(`Server is running on http://localhost:${PORT}`);
}
await bootstrap();
