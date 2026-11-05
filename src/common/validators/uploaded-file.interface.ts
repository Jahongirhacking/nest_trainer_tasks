import type { IFile } from '@nestjs/common/pipes/file/interfaces/index.js';

/**
 * The part of a Multer file the validators look at. Everything except
 * `buffer` is CLIENT-CONTROLLED text or a number the client can fake.
 */
export interface UploadedFileLike extends IFile {
  originalname: string;
  mimetype: string;
  /** Multer's count of bytes received. */
  size: number;
  /** Present with MemoryStorage only. */
  buffer?: Buffer;
}
