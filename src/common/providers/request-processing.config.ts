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
 * TODO: Implement it. Invalid input must fail fast with an `Error` whose
 *       message names the offending variable.
 */
export function loadRequestProcessingConfig(
  _env: NodeJS.ProcessEnv,
): RequestProcessingConfig {
  return {
    requestLoggingEnabled: _env.REQUEST_LOGGING_ENABLED !== 'false',
    timingLogsEnabled: _env.REQUEST_TIMING_ENABLED !== 'false',
    maxPageSize: Number(_env.MAX_PAGE_SIZE) || 100,
    requestIdHeader: _env.REQUEST_ID_HEADER || 'x-request-id',
    environment: _env.NODE_ENV || 'development',
  };
}
