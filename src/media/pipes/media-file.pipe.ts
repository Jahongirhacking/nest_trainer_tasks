import type { ParseFilePipe } from '@nestjs/common';
import type { UploadLimits } from '../interfaces/media.interface.js';

/**
 * Builds the pipe that validates ONE uploaded file (the multiple-upload
 * endpoint applies the same rules to every file).
 *
 * Rules (media-file.pipe.spec.ts): a missing file, an unsupported type, a wrong
 * or spoofed signature, an empty file, an oversized file are all rejected with
 * an HTTP exception whose status is 400 (413 when you can tell it is about the
 * size). A valid file is returned unchanged.
 *
 * TODO: Compose `ParseFilePipe` from the four validators in
 *       src/common/validators and ALLOWED_MEDIA_TYPES. Pay attention to the
 *       order and to the default status code of `ParseFilePipe`.
 */
export function createMediaFilePipe(_limits: UploadLimits): ParseFilePipe {
  throw new Error('Not implemented');
}
