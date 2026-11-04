import type { RequestProcessingConfig } from '../interfaces/request-processing-config.interface.js';

/**
 * Turns environment variables into a validated `RequestProcessingConfig`.
 * A pure function on purpose: no Nest, no `process.env` access inside, so it is
 * trivial to test with any `env` object.
 *
 *   variable                 field                  default
 *   REQUEST_LOGGING_ENABLED  requestLoggingEnabled  true
 *   REQUEST_TIMING_ENABLED   timingLogsEnabled      true
 *   MAX_PAGE_SIZE            maxPageSize            100
 *   REQUEST_ID_HEADER        requestIdHeader        "x-request-id"
 *   NODE_ENV                 environment            "development"
 *
 * The exact rules (accepted boolean spellings, what is invalid, immutability)
 * are in ASSIGNMENT.md, "Module D", and checked by
 * request-processing.provider.spec.ts.
 *
 * A variable that is not set (`undefined`) gets its default; a variable that is
 * set but invalid (including `""`) fails fast with an `Error` that names it.
 */
const HEADER_NAME = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;

function parseBoolean(
  name: string,
  raw: string | undefined,
  fallback: boolean,
): boolean {
  if (raw === undefined) return fallback;
  const value = raw.toLowerCase();
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw new Error(`${name} must be "true", "false", "1" or "0", got "${raw}"`);
}

function parsePositiveInt(
  name: string,
  raw: string | undefined,
  fallback: number,
): number {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value <= 0)
    throw new Error(`${name} must be a positive integer, got "${raw}"`);
  return value;
}

function parseHeaderName(
  name: string,
  raw: string | undefined,
  fallback: string,
): string {
  if (raw === undefined) return fallback;
  if (!HEADER_NAME.test(raw))
    throw new Error(`${name} must be a valid HTTP header name, got "${raw}"`);
  return raw.toLowerCase();
}

export function loadRequestProcessingConfig(
  env: NodeJS.ProcessEnv,
): RequestProcessingConfig {
  return Object.freeze({
    requestLoggingEnabled: parseBoolean(
      'REQUEST_LOGGING_ENABLED',
      env.REQUEST_LOGGING_ENABLED,
      true,
    ),
    timingLogsEnabled: parseBoolean(
      'REQUEST_TIMING_ENABLED',
      env.REQUEST_TIMING_ENABLED,
      true,
    ),
    maxPageSize: parsePositiveInt('MAX_PAGE_SIZE', env.MAX_PAGE_SIZE, 100),
    requestIdHeader: parseHeaderName(
      'REQUEST_ID_HEADER',
      env.REQUEST_ID_HEADER,
      'x-request-id',
    ),
    environment: env.NODE_ENV || 'development',
  });
}
