import type { Readable } from 'node:stream';
import type {
  StorageService,
  StorageUploadInput,
  StoredObject,
} from '../../src/storage/interfaces/storage-service.interface.js';

/**
 * Wraps the REAL storage of the application and fails on demand, so e2e tests
 * can check cleanup after storage errors without starting a second app (two
 * apps in one test file share the database connection). The messages contain a
 * fake path on purpose: nothing of it may reach an HTTP response.
 */
export class FlakyStorage implements StorageService {
  private uploads = 0;
  /** 1-based number of the `upload()` call (since the last reset) that fails. */
  failUploadAt = 0;
  failDelete = false;

  constructor(private readonly inner: StorageService) {}

  reset(): void {
    this.uploads = 0;
    this.failUploadAt = 0;
    this.failDelete = false;
  }

  async upload(input: StorageUploadInput): Promise<StoredObject> {
    this.uploads += 1;
    if (this.uploads === this.failUploadAt)
      throw new Error('ENOSPC: no space left on device, open /var/secret/media/x');
    return this.inner.upload(input);
  }
  read(key: string): Promise<Readable> {
    return this.inner.read(key);
  }
  exists(key: string): Promise<boolean> {
    return this.inner.exists(key);
  }
  async delete(key: string): Promise<void> {
    if (this.failDelete)
      throw new Error('EACCES: permission denied, unlink /var/secret/media/x');
    return this.inner.delete(key);
  }
}
