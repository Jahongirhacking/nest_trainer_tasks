import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { map, Observable } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const res = context.switchToHttp().getResponse<Response>();
    const startTime = new Date();
    return next.handle().pipe(
      map((data: unknown) => ({
        status: res.statusCode,
        data,
        interval: `${Number(new Date()) - Number(startTime)}ms`,
      })),
    );
  }
}
