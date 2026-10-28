import { NotImplementedException } from '@nestjs/common';
import { buildJwtConfig } from './auth.config.js';

/** The function must throw a REAL configuration error, not the scaffold's 501. */
function configError(fn: () => unknown): Error {
  try {
    fn();
  } catch (error) {
    expect(error).not.toBeInstanceOf(NotImplementedException);
    return error as Error;
  }
  throw new Error('expected buildJwtConfig to throw');
}

const STRONG = 'x'.repeat(48);

describe('buildJwtConfig', () => {
  it('returns the secret and lifetime from the environment', () => {
    const config = buildJwtConfig({
      NODE_ENV: 'production',
      JWT_SECRET: STRONG,
      JWT_EXPIRES_IN: '10m',
    });
    expect(config.secret).toBe(STRONG);
    expect(config.expiresIn).toBe('10m');
  });

  it('always ends up with an explicit, non-empty lifetime', () => {
    const config = buildJwtConfig({
      NODE_ENV: 'production',
      JWT_SECRET: STRONG,
    });
    expect(String(config.expiresIn).length).toBeGreaterThan(0);
  });

  it('passes issuer and audience through when configured', () => {
    const config = buildJwtConfig({
      NODE_ENV: 'production',
      JWT_SECRET: STRONG,
      JWT_ISSUER: 'issuer',
      JWT_AUDIENCE: 'audience',
    });
    expect(config).toMatchObject({ issuer: 'issuer', audience: 'audience' });
  });

  it.each([
    ['production', {}],
    ['production', { JWT_SECRET: '' }],
    ['production', { JWT_SECRET: '    ' }],
    ['development', {}],
    ['development', { JWT_SECRET: '' }],
    ['test', {}],
    [undefined, {}],
  ])('has no fallback secret (NODE_ENV=%s, %j)', (nodeEnv, extra) => {
    configError(() => buildJwtConfig({ NODE_ENV: nodeEnv, ...extra }));
  });

  it('rejects a weak secret in production', () => {
    configError(() =>
      buildJwtConfig({ NODE_ENV: 'production', JWT_SECRET: 'short-secret' }),
    );
  });

  it('never puts the secret value in an error message', () => {
    const weak = 'short-secret';
    const error = configError(() =>
      buildJwtConfig({ NODE_ENV: 'production', JWT_SECRET: weak }),
    );
    expect(error.message).not.toContain(weak);
  });

  it('names the missing variable so the problem is easy to fix', () => {
    const error = configError(() => buildJwtConfig({ NODE_ENV: 'production' }));
    expect(error.message).toContain('JWT_SECRET');
  });
});
