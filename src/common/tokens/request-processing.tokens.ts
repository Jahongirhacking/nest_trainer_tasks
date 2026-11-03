/**
 * Injection tokens and metadata keys of the request processing system
 * (Task 6). The tests use THESE exports, so do not rename or change them.
 */

/** Injection token of the `RequestProcessingConfig` object. */
export const REQUEST_PROCESSING_CONFIG = Symbol('REQUEST_PROCESSING_CONFIG');

/** Injection token of the `RequestLogger` sink every log entry goes through. */
export const REQUEST_LOGGER = Symbol('REQUEST_LOGGER');

/**
 * The property of the Express request where the middleware stores the
 * `RequestMetadataInfo`. Middleware WRITES it, the decorator and the interceptor
 * READ it.
 */
export const REQUEST_METADATA_PROPERTY = 'requestMetadata';

/**
 * Metadata key written by `@SkipRequestTiming()` and read (through the
 * Reflector) by the timing interceptor. The decorator tests check this key.
 */
export const SKIP_REQUEST_TIMING_KEY = 'request-processing:skip-timing';

/** `requestId` used in log entries when no metadata is on the request. */
export const UNKNOWN_REQUEST_ID = 'unknown';
