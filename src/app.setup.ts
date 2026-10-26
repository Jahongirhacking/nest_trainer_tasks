import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

/**
 * Application-wide configuration shared by `main.ts` AND the E2E tests,
 * so the tests exercise exactly the same global setup as the real server.
 *
 * TODO: Register the global ValidationPipe here (see ASSIGNMENT.md, "DTOs").
 *       It must strip/reject unexpected properties and reject invalid values.
 *
 * TASK 2 TODO: the pipe below already exists from Task 1. Review whether its
 *       configuration is enough for ASSIGNMENT.md (error format, field-level
 *       details), and register anything else Task 2 needs (e.g. a filter,
 *       see src/common/filters/http-exception.filter.ts) in this function.
 *
 * (Alternative: you may register the pipe with the APP_PIPE provider in
 * AppModule instead. If you do, leave this function empty.)
 */
export function configureApp(app: INestApplication): void {
  // TODO: app.useGlobalPipes(...)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
}
