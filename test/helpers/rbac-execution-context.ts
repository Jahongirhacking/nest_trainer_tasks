import type { ExecutionContext, Type } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';

/**
 * A REAL Nest ExecutionContext for `Controller.prototype[handlerName]`, so a
 * Reflector reading `context.getHandler()` / `context.getClass()` sees exactly
 * the metadata the decorators wrote. `user` becomes `request.user`.
 */
export function contextFor<T extends object>(
  controller: Type<T>,
  handlerName: keyof T & string,
  user?: unknown,
): ExecutionContext {
  const request = user === undefined ? {} : { user };
  const handler = controller.prototype[handlerName] as (
    ...args: unknown[]
  ) => unknown;
  return new ExecutionContextHost(
    [request, {}, () => undefined],
    controller,
    handler,
  );
}
