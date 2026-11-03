import type { ExecutionContext } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { paramDecoratorFactory } from '../../../test/helpers/param-decorator.js';
import type { RequestMetadataInfo } from '../interfaces/request-metadata.interface.js';
import { REQUEST_METADATA_PROPERTY } from '../tokens/request-processing.tokens.js';
import { RequestMetadata } from './request-metadata.decorator.js';

/**
 * Module E: `@RequestMetadata()` hands the metadata recorded by the middleware
 * to a controller, through ExecutionContext, never through `@Req()`.
 */
const metadata: RequestMetadataInfo = {
  requestId: 'req-123',
  startedAt: new Date('2026-01-01T10:00:00.000Z'),
  clientIp: '203.0.113.7',
  userAgent: 'spec-agent/1.0',
};

const contextFor = (request: object): ExecutionContext =>
  new ExecutionContextHost([request, {}, () => undefined]);

const extract = (property: string | undefined, request: object) =>
  paramDecoratorFactory(RequestMetadata, property)(
    property,
    contextFor(request),
  );

describe('@RequestMetadata()', () => {
  const request = { [REQUEST_METADATA_PROPERTY]: metadata };

  it('returns the whole metadata without a property name', () => {
    expect(extract(undefined, request)).toEqual(metadata);
  });

  it.each([
    ['requestId', 'req-123'],
    ['clientIp', '203.0.113.7'],
    ['userAgent', 'spec-agent/1.0'],
    ['startedAt', metadata.startedAt],
  ])('returns only "%s" when asked for it', (property, expected) => {
    expect(extract(property, request)).toEqual(expected);
  });

  it('returns undefined for fields the client did not provide', () => {
    const anonymous = {
      [REQUEST_METADATA_PROPERTY]: {
        ...metadata,
        clientIp: undefined,
        userAgent: undefined,
      },
    };
    expect(extract(undefined, anonymous)).toMatchObject({ requestId: 'req-123' });
    expect(extract('userAgent', anonymous)).toBeUndefined();
    expect(extract('clientIp', anonymous)).toBeUndefined();
  });

  describe('when the middleware did not run', () => {
    it('returns undefined instead of throwing', () => {
      // ...while the same decorator does return data when the middleware ran
      expect(extract('requestId', request)).toBe('req-123');
      expect(() => extract(undefined, {})).not.toThrow();
      expect(extract(undefined, {})).toBeUndefined();
      expect(extract('requestId', {})).toBeUndefined();
    });
  });

  describe('what it must not expose', () => {
    const risky = {
      ...request,
      headers: { authorization: 'Bearer secret-token', cookie: 'session=abc' },
      user: { id: 1, email: 'admin@example.com', role: 'admin' },
      body: { password: 'hunter2' },
    };

    it('returns nothing but the four metadata fields', () => {
      const result = extract(undefined, risky) as RequestMetadataInfo;
      expect(Object.keys(result).sort()).toEqual([
        'clientIp',
        'requestId',
        'startedAt',
        'userAgent',
      ]);
      expect(JSON.stringify(result)).not.toMatch(/secret-token|session=abc|hunter2/);
    });

    it('does not read the authenticated user (that is @CurrentUser())', () => {
      expect(extract('requestId', risky)).toBe('req-123');
      expect(extract('user', risky)).toBeUndefined();
    });
  });
});
