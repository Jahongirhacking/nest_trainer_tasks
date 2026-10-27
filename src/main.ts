import { Logger } from '@nestjs/common';
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

try {
  await bootstrap();
} catch (error) {
  // The message names missing variables / the unreachable host, never the
  // credentials (see src/database/database.config.ts).
  new Logger('Bootstrap').error(
    `Application failed to start: ${(error as Error).message}. ` +
      `Is PostgreSQL running and are the DB_* variables in .env correct?`,
  );
  process.exit(1);
}
