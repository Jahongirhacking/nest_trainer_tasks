import { Injectable, Logger } from '@nestjs/common';
import type {
  RequestLogEntry,
  RequestLogger,
} from '../interfaces/request-log.interface.js';

/**
 * Default `RequestLogger`: forwards every entry, as one JSON line, to Nest's
 * `Logger`. GIVEN: it is the sink, not part of the assignment. The tests
 * replace it with an in-memory sink.
 */
@Injectable()
export class NestRequestLogger implements RequestLogger {
  private readonly logger = new Logger('Request');

  log(entry: RequestLogEntry): void {
    this.logger.log(JSON.stringify(entry));
  }
}
