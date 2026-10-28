import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { QueryFailedError } from 'typeorm';
import {
  getDriverError,
  isUniqueViolation,
} from '../database/postgres-errors.js';

interface FieldError {
  field: string;
  messages: string[];
}

/** Turns ValidationPipe's flat message list into `{ field, messages }[]`. */
function toFieldErrors(messages: string[]): FieldError[] {
  const byField = new Map<string, string[]>();
  for (const item of messages) {
    const unknown = item.match(/^property (\w+) should not exist$/);
    const field = unknown ? unknown[1] : item.split(' ')[0];
    byField.set(field, [...(byField.get(field) ?? []), item]);
  }
  return [...byField].map(([field, msgs]) => ({ field, messages: msgs }));
}

@Catch()
export class GlobalExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: FieldError[] | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      const raw =
        typeof body === 'string'
          ? body
          : (body as { message?: string | string[] }).message;

      if (Array.isArray(raw)) {
        message = 'Validation failed';
        errors = toFieldErrors(raw);
      } else {
        message = raw ?? exception.message;
      }
    } else if (
      exception instanceof QueryFailedError &&
      isUniqueViolation(exception)
    ) {
      statusCode = HttpStatus.CONFLICT;
      message = 'Name already exists';
    } else {
      // Unknown failure: keep it observable in the logs, hide it from the client.
      const driverCode =
        exception instanceof QueryFailedError
          ? ` (database error ${getDriverError(exception)?.code ?? 'unknown'})`
          : '';
      this.logger.error(
        (exception instanceof Error ? exception.message : String(exception)) +
          driverCode,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json({
      statusCode,
      error: STATUS_CODES[statusCode],
      message,
      ...(errors?.length ? { errors } : {}),
    });
  }
}
