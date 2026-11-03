import { Reflector } from '@nestjs/core';
import { SKIP_REQUEST_TIMING_KEY } from '../tokens/request-processing.tokens.js';
import { SkipRequestTiming } from './skip-request-timing.decorator.js';

/** Module F: the decorator only records metadata. */
@SkipRequestTiming()
class SkippingController {
  inherited() {}

  @SkipRequestTiming(false)
  timedAgain() {}
}

class MethodLevelController {
  plain() {}

  @SkipRequestTiming()
  skipped() {}

  @SkipRequestTiming(false)
  explicitlyTimed() {}
}

describe('@SkipRequestTiming()', () => {
  const reflector = new Reflector();

  it('records `true` on a method', () => {
    expect(
      reflector.get(SKIP_REQUEST_TIMING_KEY, MethodLevelController.prototype.skipped),
    ).toBe(true);
  });

  it('records `true` on a class', () => {
    expect(reflector.get(SKIP_REQUEST_TIMING_KEY, SkippingController)).toBe(true);
  });

  it('records the boolean it is given (`false` re-enables timing)', () => {
    expect(
      reflector.get(
        SKIP_REQUEST_TIMING_KEY,
        MethodLevelController.prototype.explicitlyTimed,
      ),
    ).toBe(false);
    expect(
      reflector.get(SKIP_REQUEST_TIMING_KEY, SkippingController.prototype.timedAgain),
    ).toBe(false);
  });

  it('records nothing on undecorated methods', () => {
    expect(
      reflector.get(SKIP_REQUEST_TIMING_KEY, MethodLevelController.prototype.plain),
    ).toBeUndefined();
    expect(
      reflector.get(SKIP_REQUEST_TIMING_KEY, SkippingController.prototype.inherited),
    ).toBeUndefined();
  });

  it('only records metadata: the decorated method still works', () => {
    const controller = new MethodLevelController();
    expect(controller.skipped()).toBeUndefined();
    expect(controller.skipped).toBeTypeOf('function');
  });
});
