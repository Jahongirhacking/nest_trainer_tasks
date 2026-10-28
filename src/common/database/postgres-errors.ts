/**
 * Helpers for recognising KNOWN PostgreSQL constraint violations.
 *
 * TypeORM wraps driver errors in `QueryFailedError`; the original `pg` error
 * (with the SQLSTATE `code`) is available as `error.driverError`.
 *
 * Reference SQLSTATE codes:
 *   23505 unique_violation
 *   23503 foreign_key_violation
 *
 * TODO: Implement both helpers. They must return `true` ONLY for the exact
 *       violation named. They must NOT treat every database error as a
 *       conflict: unexpected errors must stay observable (logged, HTTP 500).
 * TODO (optional): also check which constraint was violated
 *       (`driverError.constraint`) if a table has several.
 */

export const PG_UNIQUE_VIOLATION = '23505';
export const PG_FOREIGN_KEY_VIOLATION = '23503';

interface PostgreSqlDriverError {
  code?: string;
  constraint?: string;
}

export function getDriverError(
  error: unknown,
): PostgreSqlDriverError | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  if (!('driverError' in error)) {
    return undefined;
  }

  const driverError = error.driverError;

  if (typeof driverError !== 'object' || driverError === null) {
    return undefined;
  }

  if (!('code' in driverError)) {
    return undefined;
  }

  return driverError as PostgreSqlDriverError;
}

export function isUniqueViolation(_error: unknown): boolean {
  // TODO: implement.
  return getDriverError(_error)?.code === PG_UNIQUE_VIOLATION;
}

export function isForeignKeyViolation(_error: unknown): boolean {
  // TODO: implement.
  return getDriverError(_error)?.code === PG_FOREIGN_KEY_VIOLATION;
}
