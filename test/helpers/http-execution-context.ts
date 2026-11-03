import type { ExecutionContext, Type } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';

/**
 * A REAL Nest ExecutionContext for `Controller.prototype[handlerName]` with
 * the `request` and `response` objects you pass in. A Reflector reading
 * `getHandler()` / `getClass()` sees exactly the decorators' metadata.
 */
export function httpContext<T extends object>(
  controller: Type<T>,
  handlerName: keyof T & string,
  request: object = {},
  response: object = {},
): ExecutionContext {
  const handler = controller.prototype[handlerName] as (
    ...args: unknown[]
  ) => unknown;
  return new ExecutionContextHost(
    [request, response, () => undefined],
    controller,
    handler,
  );
}
