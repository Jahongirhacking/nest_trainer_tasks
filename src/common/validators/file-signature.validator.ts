import { FileValidator } from '@nestjs/common';
import type { UploadedFileLike } from './uploaded-file.interface.js';

export interface FileSignatureOptions {
  /** MIME types whose signature this validator knows how to check. */
  allowed: readonly string[];
}

/**
 * Checks the first bytes of the CONTENT ("magic bytes") and that they match
 * the MIME type the client declared.
 *
 * Rules (file-validators.spec.ts): valid JPEG / PNG / WebP / PDF content is
 * accepted; HTML or an executable renamed to .jpg is rejected; PNG content
 * declared as image/jpeg is rejected; an empty or too short buffer is
 * rejected; a RIFF container that is not WebP (e.g. WAV) is rejected; a
 * missing `buffer` (not loaded in memory) is rejected, never accepted.
 *
 * TODO: Research the signatures yourself (JPEG, PNG, WebP, PDF) and implement
 *       `isValid` and `buildErrorMessage`. Think about what a signature check
 *       does NOT prove (polyglot files, appended payloads) and what you do
 *       about it when the file is later served.
 */
export class FileSignatureValidator extends FileValidator<
  FileSignatureOptions,
  UploadedFileLike
> {
  isValid(_file?: UploadedFileLike | UploadedFileLike[]): boolean {
    throw new Error('Not implemented');
  }

  buildErrorMessage(_file: UploadedFileLike): string {
    throw new Error('Not implemented');
  }
}
