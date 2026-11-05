import { Readable } from 'node:stream';
import type {
  StorageService,
  StorageUploadInput,
  StoredObject,
} from '../../src/storage/interfaces/storage-service.interface.js';
import { StorageObjectNotFoundError } from '../../src/storage/storage.errors.js';

/**
 * In-memory StorageService for tests: no disk, no cloud. It can be told to fail
 * so the tests can check cleanup and error handling. The messages it throws
 * contain a fake path on purpose: nothing of it may reach an HTTP response.
 */
export class FakeStorageService implements StorageService {
  readonly objects = new Map<string, Buffer>();
  private uploads = 0;

  /** 1-based number of the `upload()` call that must fail (0 = never). */
  failUploadAt = 0;
  failDelete = false;

  get count(): number {
    return this.objects.size;
  }

  async upload(input: StorageUploadInput): Promise<StoredObject> {
    this.uploads += 1;
    if (this.uploads === this.failUploadAt)
      throw new Error('ENOSPC: no space left on device, open /var/secret/media/x');
    const key = `fake/${this.uploads}-${Math.random().toString(36).slice(2)}`;
    this.objects.set(key, Buffer.from(input.data));
    return { key, size: input.data.length };
  }

  async read(key: string): Promise<Readable> {
    const data = this.objects.get(key);
    if (!data) throw new StorageObjectNotFoundError();
    return Readable.from([data]);
  }

  async exists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  async delete(key: string): Promise<void> {
    if (this.failDelete)
      throw new Error('EACCES: permission denied, unlink /var/secret/media/x');
    this.objects.delete(key);
  }
}
