import { FileValidator } from '@nestjs/common';
import type { AllowedMediaType } from '../../media/media.constants.js';
import type { UploadedFileLike } from './uploaded-file.interface.js';

export interface AllowedExtensionOptions {
  /** The MIME type <-> extensions table (ALLOWED_MEDIA_TYPES). */
  types: readonly AllowedMediaType[];
}

/**
 * Checks the extension of the ORIGINAL file name against the table.
 *
 * Rules (file-validators.spec.ts): the extension must be allowed AND belong to
 * the file's declared MIME type; case-insensitive; no extension, a double
 * extension such as "a.jpg.exe", or a name with trailing spaces/dots is
 * rejected. The name is untrusted text: it can contain "/", "\", NUL, ...
 *
 * TODO: Implement `isValid` and `buildErrorMessage`.
 */
export class AllowedExtensionValidator extends FileValidator<
  AllowedExtensionOptions,
  UploadedFileLike
> {
  isValid(_file?: UploadedFileLike | UploadedFileLike[]): boolean {
    throw new Error('Not implemented');
  }

  buildErrorMessage(_file: UploadedFileLike): string {
    throw new Error('Not implemented');
  }
}
