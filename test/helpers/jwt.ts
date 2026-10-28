import { createHmac } from 'node:crypto';

/**
 * Test-only authentication settings. They are applied to `process.env` by
 * `applyTestEnv()` (test/helpers/test-env.ts) and are NOT secrets.
 */
export const TEST_JWT_SECRET =
  'test-only-secret-never-use-outside-automated-tests-0123456789';
export const TEST_JWT_EXPIRES_IN = '15m';
export const TEST_JWT_ISSUER = 'claude-trainer-tests';
export const TEST_JWT_AUDIENCE = 'claude-trainer-api';

const b64url = (value: object | Buffer): string =>
  (Buffer.isBuffer(value)
    ? value
    : Buffer.from(JSON.stringify(value))
  ).toString('base64url');

export interface SignOptions {
  secret?: string;
  /** Seconds from now; negative = already expired. Default 900. */
  expiresInSeconds?: number;
  issuer?: string | null;
  audience?: string | null;
  /** `none` produces an unsigned token. */
  alg?: 'HS256' | 'none';
}

/**
 * Signs an HS256 token WITHOUT any NestJS/Passport code, so the tests can
 * forge tokens (expired, wrong secret, wrong issuer, tampered claims, ...)
 * independently of your implementation.
 */
export function signTestJwt(
  claims: Record<string, unknown>,
  options: SignOptions = {},
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    iat: now,
    exp: now + (options.expiresInSeconds ?? 900),
    ...claims,
  };
  const issuer =
    options.issuer === undefined ? TEST_JWT_ISSUER : options.issuer;
  const audience =
    options.audience === undefined ? TEST_JWT_AUDIENCE : options.audience;
  if (issuer !== null) payload.iss = issuer;
  if (audience !== null) payload.aud = audience;

  const alg = options.alg ?? 'HS256';
  const signingInput = `${b64url({ alg, typ: 'JWT' })}.${b64url(payload)}`;
  if (alg === 'none') return `${signingInput}.`;
  const signature = createHmac('sha256', options.secret ?? TEST_JWT_SECRET)
    .update(signingInput)
    .digest();
  return `${signingInput}.${b64url(signature)}`;
}

/** Decodes the payload of a token WITHOUT verifying it (inspection only). */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

/** Replaces the payload of a signed token and keeps the old signature. */
export function tamperPayload(
  token: string,
  changes: Record<string, unknown>,
): string {
  const [header, , signature] = token.split('.');
  const payload = { ...decodeJwtPayload(token), ...changes };
  return `${header}.${b64url(payload)}.${signature}`;
}
