import type { UploadLimits } from '../interfaces/media.interface.js';

/**
 * Turns environment variables into validated, immutable `UploadLimits`.
 *
 *   variable                  field             default
 *   MEDIA_MAX_FILE_SIZE_BYTES maxFileSizeBytes  5242880 (5 MiB)
 *   MEDIA_MAX_FILES           maxFiles          5
 *
 * Rules (media-config.spec.ts): unset -> default; set but not a positive safe
 * integer made of digits only ("", "0", "-1", "1.5", "1e3", "abc") -> throw an
 * Error that names the variable; the result is frozen; only the given `env`
 * is read.
 *
 * TODO: Implement it.
 */
export function loadUploadLimits(_env: NodeJS.ProcessEnv): UploadLimits {
  throw new Error('Not implemented');
}
