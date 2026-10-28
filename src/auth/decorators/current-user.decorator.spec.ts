import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import type { ExecutionContext } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator.js';

/**
 * Nest does not expose a param decorator's factory directly. The usual
 * technique: apply the decorator to a throw-away method, read the route-args
 * metadata Nest stored for it and call the registered factory ourselves.
 */
class Probe {
  whole(@CurrentUser() _user: unknown) {}
  email(@CurrentUser('email') _email: unknown) {}
}

function factoryFor(method: keyof Probe) {
  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Probe, method);
  const entry = Object.values(metadata)[0] as {
    factory: (data: unknown, ctx: ExecutionContext) => unknown;
    data: unknown;
  };
  return (request: object) =>
    entry.factory(entry.data, {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext);
}

const principal = { id: 1, email: 'dev@example.com' };

describe('CurrentUser decorator', () => {
  it('returns the authenticated principal from the request', () => {
    expect(factoryFor('whole')({ user: principal })).toEqual(principal);
  });

  it('returns a single property when one is requested', () => {
    expect(factoryFor('email')({ user: principal })).toBe('dev@example.com');
  });

  it('ignores identity data a client could send', () => {
    const request = {
      user: principal,
      body: { id: 99, email: 'attacker@example.com' },
      query: { id: '99' },
      params: { id: '99' },
      headers: { 'x-user-id': '99' },
    };
    expect(factoryFor('whole')(request)).toEqual(principal);
    expect(factoryFor('email')(request)).toBe('dev@example.com');
  });

  it('returns undefined (not another source) when nothing authenticated the request', () => {
    expect(factoryFor('whole')({ body: { id: 99 } })).toBeUndefined();
    expect(factoryFor('email')({ body: { email: 'x@y.z' } })).toBeUndefined();
  });
});
