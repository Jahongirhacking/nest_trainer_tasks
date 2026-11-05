import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface.js';
import multer from 'multer';
import type { UploadLimits } from '../interfaces/media.interface.js';

/**
 * Multer options for the media endpoints, kept OUT of the controller.
 *
 * Rules (media-config.spec.ts):
 *  - `limits.fileSize` and `limits.files` come from `limits`;
 *  - the other limits (`fields`, `parts`, `fieldSize`, `headerPairs`) are also
 *    finite, so a request cannot be made of endless parts;
 *  - nothing is written to the system temp directory by accident: you choose
 *    `storage` deliberately (MemoryStorage or DiskStorage).
 *
 * TODO: Implement it. Be ready to explain MemoryStorage vs DiskStorage, what a
 *       large file does to a process in memory, and who deletes temporary
 *       files left by DiskStorage when a request fails.
 */
export function buildMulterOptions(_limits: UploadLimits): MulterOptions {
  return {
    storage: multer.memoryStorage(),
    limits: {
      files: _limits.maxFiles,
      fileSize: _limits.maxFileSizeBytes,
    },
  };
}
