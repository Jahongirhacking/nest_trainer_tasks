import { FileValidator } from '@nestjs/common';
import type { UploadedFileLike } from './uploaded-file.interface.js';

export interface AllowedMimeTypeOptions {
  /** Exact MIME types that are accepted, e.g. ["image/png", "application/pdf"]. */
  allowed: readonly string[];
}

/**
 * Accepts only MIME types from an explicit allow-list (exact match, no prefix
 * matching, no wildcards). It checks what the client DECLARED; that value is
 * not proof of anything on its own (see FileSignatureValidator).
 *
 * TODO: Implement `isValid` and `buildErrorMessage`. The message must not echo
 *       the whole allow-list back as an invitation to guess.
 */
export class AllowedMimeTypeValidator extends FileValidator<
  AllowedMimeTypeOptions,
  UploadedFileLike
> {
  isValid(_file?: UploadedFileLike | UploadedFileLike[]): boolean {
    throw new Error('Not implemented');
  }

  buildErrorMessage(_file: UploadedFileLike): string {
    throw new Error('Not implemented');
  }
}
