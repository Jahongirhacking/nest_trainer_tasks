/** Settings of the storage layer, injected by `STORAGE_CONFIG`. */
export interface StorageConfig {
  /** Only "local" exists today; "s3" / "r2" would be added later. */
  readonly driver: 'local';
  /** ABSOLUTE directory that holds every stored file. */
  readonly localRoot: string;
}

/**
 * Turns environment variables into a validated, immutable `StorageConfig`.
 *
 *   variable             field      default
 *   STORAGE_DRIVER       driver     "local"
 *   STORAGE_LOCAL_ROOT   localRoot  (none: REQUIRED)
 *
 * Rules (checked by storage.config.spec.ts):
 *  - a pure function: it only looks at the `env` it is given;
 *  - unset STORAGE_DRIVER -> "local"; any other value -> throw;
 *  - STORAGE_LOCAL_ROOT missing, empty or whitespace -> throw;
 *  - STORAGE_LOCAL_ROOT must be an ABSOLUTE path (a relative one depends on
 *    the working directory of the process) -> otherwise throw;
 *  - the error message names the variable, never anything else;
 *  - the returned object is frozen.
 *
 * TODO: Implement it.
 */
export function loadStorageConfig(_env: NodeJS.ProcessEnv): StorageConfig {
  const driver = _env.STORAGE_DRIVER;
  if (driver && driver !== 'local')
    throw new Error('Only local driver available');
  const localRoot = _env.STORAGE_LOCAL_ROOT;
  if (!localRoot) throw new Error('Local root not found');
  return {
    driver: (driver || 'local') as 'local',
    localRoot,
  };
}
