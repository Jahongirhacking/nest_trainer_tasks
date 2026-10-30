import type { JwtConfig } from './auth.constants.js';

/**
 * Reads and VALIDATES the authentication settings from environment variables.
 *
 *   JWT_SECRET       required
 *   JWT_EXPIRES_IN   lifetime such as "15m" (see ASSIGNMENT.md for the default)
 *   JWT_ISSUER       optional
 *   JWT_AUDIENCE     optional
 *
 * TODO: Implement it (the tests in auth.config.spec.ts describe the contract):
 *       - NO insecure fallback secret, in ANY environment.
 *       - Missing, empty or whitespace-only JWT_SECRET -> throw.
 *       - In production a weak secret (shorter than 32 characters) -> throw.
 *       - The error message names the variable, never its value.
 * TODO: Call it while the application builds its module graph (for example from
 *       a provider for the JWT_CONFIG token), so a bad configuration stops the
 *       application at STARTUP rather than at the first login.
 */
export function buildJwtConfig(
  _env: NodeJS.ProcessEnv = process.env,
): JwtConfig {
  const secret = _env.JWT_SECRET?.trim();
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  if (_env.NODE_ENV === 'production' && secret.length < 32)
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  return {
    secret,
    expiresIn: _env.JWT_EXPIRES_IN?.trim() || '15m',
    issuer: _env.JWT_ISSUER?.trim() || undefined,
    audience: _env.JWT_AUDIENCE?.trim() || undefined,
  };
}
