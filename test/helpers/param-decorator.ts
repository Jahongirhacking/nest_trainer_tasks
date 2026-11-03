import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import type { ExecutionContext } from '@nestjs/common';

type Factory = (data: unknown, context: ExecutionContext) => unknown;

/**
 * Extracts the factory of a `createParamDecorator()` decorator, so it can be
 * called with a hand-made ExecutionContext. Nest stores it as route-args
 * metadata of the class that uses the decorator.
 */
export function paramDecoratorFactory(
  decorator: (...args: any[]) => ParameterDecorator,
  data?: unknown,
): Factory {
  class Probe {
    handler(@decorator(data) _value: unknown) {}
  }
  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    Probe,
    'handler',
  ) as Record<string, { factory: Factory; data: unknown }>;
  const { factory } = Object.values(metadata)[0];
  return (_data, context) => factory(data, context);
}
