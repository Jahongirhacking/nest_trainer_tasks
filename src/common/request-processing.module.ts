import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { NestRequestLogger } from './providers/nest-request-logger.js';
import { requestProcessingConfigProvider } from './providers/request-processing.provider.js';
import {
  REQUEST_LOGGER,
  REQUEST_PROCESSING_CONFIG,
} from './tokens/request-processing.tokens.js';

/**
 * Wiring of the Task 6 request processing system.
 *
 * Given: the config provider slot, the logger sink, the exports.
 * Yours (see ASSIGNMENT.md, "Implementation checklist"):
 *
 * TODO: Register `RequestLoggingMiddleware` for every route in `configure()`.
 * TODO: Register `RequestTimingInterceptor` (global, through the APP_INTERCEPTOR
 *       token, or per controller - decide and defend it). Its dependencies
 *       (Reflector, config, logger) must resolve.
 * TODO: Import this module where it is needed: `AppModule`, and the module
 *       whose controllers use `PaginationPipe` (it injects the config token).
 *       Nothing imports it yet on purpose: until the config provider works the
 *       application would not start.
 */
@Module({
  providers: [
    requestProcessingConfigProvider,
    { provide: REQUEST_LOGGER, useClass: NestRequestLogger },
  ],
  exports: [REQUEST_PROCESSING_CONFIG, REQUEST_LOGGER],
})
export class RequestProcessingModule implements NestModule {
  configure(_consumer: MiddlewareConsumer): void {
    // TODO: consumer.apply(...).forRoutes(...)
  }
}
