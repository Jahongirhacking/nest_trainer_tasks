import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ParsePositiveIntPipe } from '../pipes/parse-positive-int.pipe.js';

/**
 * Route param validated as a positive integer.
 *
 * A custom decorator is used on purpose: the global ValidationPipe
 * (`transform: true`) would otherwise convert a `number`-typed @Param with
 * `Number(...)` first, turning "1e3" into 1000 before our pipe could reject it.
 */
export const PositiveIntParam = (name: string) =>
  createParamDecorator((data: string, ctx: ExecutionContext) => {
    return ctx.switchToHttp().getRequest<Request>().params[data];
  })(name, ParsePositiveIntPipe);
