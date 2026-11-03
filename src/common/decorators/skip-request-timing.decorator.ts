import { SetMetadata } from '@nestjs/common';
import { SKIP_REQUEST_TIMING_KEY } from '../tokens/request-processing.tokens.js';

/**
 * `@SkipRequestTiming()` on a route (or a whole controller) turns the timing
 * interceptor off for it. `@SkipRequestTiming(false)` turns it back ON for a
 * route of a controller that skips timing.
 *
 * Rules (checked by skip-request-timing.decorator.spec.ts and the interceptor
 * spec):
 *  - works as a class decorator AND as a method decorator
 *  - records ONLY metadata under SKIP_REQUEST_TIMING_KEY, no behaviour
 *  - the value stored is the boolean passed in (default `true`)
 *  - precedence: a route-level value wins over the controller-level value; with
 *    neither present, the route IS timed
 *
 * SCAFFOLDING: this placeholder records nothing.
 *
 * TODO: Write the metadata and read it in the interceptor with `Reflector`
 *       (pick the right helper for "the handler overrides the class").
 */
export const SkipRequestTiming = (
  _skip: boolean = true,
): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_REQUEST_TIMING_KEY, _skip);
