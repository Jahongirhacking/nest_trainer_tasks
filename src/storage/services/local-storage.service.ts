import { Inject, Injectable } from '@nestjs/common';
import type { Readable } from 'node:stream';
import type { StorageConfig } from '../config/storage.config.js';
import type {
  StorageService,
  StorageUploadInput,
  StoredObject,
} from '../interfaces/storage-service.interface.js';
import { STORAGE_CONFIG } from '../tokens/storage.tokens.js';

/**
 * Stores files on the local disk below `config.localRoot`.
 *
 * Security checklist (each item has a test in local-storage.service.spec.ts):
 *  - the key is generated here, from a CSPRNG, never from user input;
 *  - the resulting path never leaves `localRoot`, whatever the key looks like;
 *  - an existing file is never overwritten;
 *  - the root is not a publicly served directory;
 *  - error messages that reach the caller do not teach the client anything
 *    about the server's directories.
 *
 * TODO: Implement every method. Decide the on-disk layout (for example a
 *       two-level fan-out directory) and defend it in your notes.
 */
@Injectable()
export class LocalStorageService implements StorageService {
  constructor(
    @Inject(STORAGE_CONFIG) private readonly config: StorageConfig,
  ) {}

  async upload(_input: StorageUploadInput): Promise<StoredObject> {
    // TODO: Generate a safe, unpredictable storage key.
    // TODO: Write the file without ever overwriting an existing one.
    // TODO: Return the key and the number of bytes written.
    void this.config;
    throw new Error('Not implemented');
  }

  async read(_key: string): Promise<Readable> {
    // TODO: Validate the key, then open a read stream.
    // TODO: Missing object -> StorageObjectNotFoundError.
    throw new Error('Not implemented');
  }

  async exists(_key: string): Promise<boolean> {
    // TODO: Validate the key, then check that the object exists.
    throw new Error('Not implemented');
  }

  async delete(_key: string): Promise<void> {
    // TODO: Validate the key, then delete. A missing object is not an error.
    throw new Error('Not implemented');
  }
}
