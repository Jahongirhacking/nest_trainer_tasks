import type { Readable } from 'node:stream';

/** What the caller hands to the storage layer. Note: NO file name. */
export interface StorageUploadInput {
  /** The complete, already validated content. */
  data: Buffer;
  /** The validated MIME type (informational for object stores such as S3). */
  contentType: string;
  /**
   * Validated extension without the dot (e.g. "jpg"). Only a SUFFIX HINT for
   * the generated key. Treat it as untrusted anyway: it must never be able to
   * change the directory a file ends up in.
   */
  extension?: string;
}

/** What the storage layer returns after a successful upload. */
export interface StoredObject {
  /**
   * Opaque identifier chosen BY THE STORAGE, never by the client. It is the
   * only thing the database remembers. For local storage it is a path
   * RELATIVE to the storage root; for S3 it would be an object key.
   */
  key: string;
  /** Bytes actually written. */
  size: number;
}

/**
 * The only thing MediaService knows about where files live. A local-disk
 * implementation can be swapped for S3 / Cloudflare R2 without touching the
 * business logic (see ASSIGNMENT.md, "Module E").
 *
 * Contract (checked by local-storage.service.spec.ts):
 *  - `upload` never overwrites: every call produces a NEW unpredictable key.
 *  - Every method that takes a `key` rejects with `InvalidStorageKeyError`
 *    for a key that is not one this storage could have generated (path
 *    traversal, absolute paths, NUL bytes, empty string...).
 *  - `delete` is idempotent: a missing object is not an error.
 *  - `read` of a missing object rejects with `StorageObjectNotFoundError`.
 */
export interface StorageService {
  upload(input: StorageUploadInput): Promise<StoredObject>;
  read(key: string): Promise<Readable>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}
