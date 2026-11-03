/** Configuration of the request processing system, injected by token. */
export interface RequestProcessingConfig {
  /** `false` -> the middleware emits NO log entries (the request id still works). */
  readonly requestLoggingEnabled: boolean;
  /** `false` -> the timing interceptor emits NO log entries. */
  readonly timingLogsEnabled: boolean;
  /** Largest `limit` the pagination pipe accepts. */
  readonly maxPageSize: number;
  /** Name of the response header that carries the request id (lower case). */
  readonly requestIdHeader: string;
  /** Value of NODE_ENV, e.g. "development", "test", "production". */
  readonly environment: string;
}
