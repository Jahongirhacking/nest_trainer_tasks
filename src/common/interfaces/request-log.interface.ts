/**
 * Log entries are STRUCTURED on purpose: the tests (and a real log pipeline)
 * read fields, not text, so the output format is not part of the assignment.
 * Entries must never contain secrets: no Authorization header, no cookies, no
 * token, password or secret in the url (see ASSIGNMENT.md, "Sensitive data").
 */

interface BaseEntry {
  requestId: string;
  method: string;
  /** Path (+ query) of the request with sensitive values removed. */
  url: string;
}

/** Emitted by the middleware when a request arrives. */
export interface RequestStartedEntry extends BaseEntry {
  event: 'request.started';
  /** ISO-8601 timestamp of `RequestMetadataInfo.startedAt`. */
  timestamp: string;
  clientIp: string | undefined;
  userAgent: string | undefined;
}

/** Emitted by the middleware when the response was sent (`finish`). */
export interface RequestCompletedEntry extends BaseEntry {
  event: 'request.completed';
  statusCode: number;
  /** Milliseconds from the middleware to the end of the response. */
  durationMs: number;
}

/** Emitted by the interceptor once per handled request (never twice). */
export interface RequestTimingEntry extends BaseEntry {
  event: 'request.timing';
  statusCode: number;
  /** Milliseconds spent between "before" and "after" the handler. */
  durationMs: number;
  outcome: 'success' | 'error';
}

export type RequestLogEntry =
  | RequestStartedEntry
  | RequestCompletedEntry
  | RequestTimingEntry;

/** Where entries go. Middleware and interceptor never call `console` or `Logger`. */
export interface RequestLogger {
  log(entry: RequestLogEntry): void;
}
