import { FileValidator } from '@nestjs/common';
import type { UploadedFileLike } from './uploaded-file.interface.js';

export interface MaxFileSizeOptions {
  /** Largest accepted size in bytes (inclusive). */
  maxSize: number;
}

/**
 * Rejects files larger than `maxSize`, and EMPTY files.
 *
 * Rules (file-validators.spec.ts): exactly `maxSize` is accepted; do not rely
 * only on the client-controlled `size` field when the content is available.
 *
 * TODO: Implement `isValid` and `buildErrorMessage`. Decide whether this class
 *       should be used in addition to Multer's `limits.fileSize` and why both
 *       exist.
 */
export class MaxFileSizeValidator extends FileValidator<
  MaxFileSizeOptions,
  UploadedFileLike
> {
  isValid(_file?: UploadedFileLike | UploadedFileLike[]): boolean {
    throw new Error('Not implemented');
  }

  buildErrorMessage(_file: UploadedFileLike): string {
    throw new Error('Not implemented');
  }
}
