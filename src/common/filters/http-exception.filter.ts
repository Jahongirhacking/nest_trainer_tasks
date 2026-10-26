import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    type HttpErrorResponse = {
      statusCode?: number;
      error?: string;
      message?: string | string[];
    };

    const responseObject: HttpErrorResponse =
      typeof exception.getResponse() === 'string'
        ? { message: exception.getResponse() as string }
        : (exception.getResponse() as HttpErrorResponse);

    const rawMessage = responseObject.message;

    const message = Array.isArray(rawMessage)
      ? 'Validation failed'
      : (rawMessage ?? exception.message);

    const errors = Array.isArray(rawMessage)
      ? rawMessage.map((item: string) => {
          const match = item.match(/^property (\w+) should not exist$/);

          return {
            field: match ? match[1] : item.split(' ')[0],
            messages: [item],
          };
        })
      : [];

    response.status(statusCode).json({
      statusCode,
      error: responseObject.error ?? exception.name,
      message,
      errors,
    });
  }
}
