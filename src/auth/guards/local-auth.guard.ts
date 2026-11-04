import {
  BadRequestException,
  Injectable,
  type ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Request } from 'express';
import { LOCAL_STRATEGY } from '../auth.constants.js';
import { LoginDto } from '../dto/login.dto.js';

/**
 * Runs the "local" strategy for POST /auth/login.
 *
 * Guards run BEFORE pipes, and Passport's local strategy reads the raw body, so
 * a malformed body (missing, numeric or object email, array password...) would
 * reach the strategy and end as 401 or 500. The body is therefore validated
 * with `LoginDto` first, which turns it into a 400 with field errors.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard(LOCAL_STRATEGY) {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const dto = plainToInstance(LoginDto, request.body ?? {});
    const errors = await validate(dto);
    if (errors.length > 0)
      throw new BadRequestException(
        errors.flatMap((error) => Object.values(error.constraints ?? {})),
      );
    return (await super.canActivate(context)) as boolean;
  }
}
