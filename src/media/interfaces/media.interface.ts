import type { Readable } from 'node:stream';
import type { MediaCategory } from '../enums/media-category.enum.js';
import type { MediaStatus } from '../enums/media-status.enum.js';

/** Limits of one upload request, injected by `UPLOAD_LIMITS`. */
export interface UploadLimits {
  /** Largest accepted file, in bytes. */
  readonly maxFileSizeBytes: number;
  /** Largest number of files in one request. */
  readonly maxFiles: number;
}

/**
 * The only shape of a media record that leaves the API. It deliberately has NO
 * `storageKey`, no path and no `uploadedById`.
 */
export interface MediaMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  extension: string;
  size: number;
  category: MediaCategory;
  status: MediaStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** What `MediaService.download()` hands to the controller. */
export interface MediaDownload {
  stream: Readable;
  mimeType: string;
  size: number;
  /** The ORIGINAL name, untrusted: the controller must encode it safely. */
  originalName: string;
}

/** The caller of a media operation (the authenticated principal). */
export interface MediaActor {
  id: number;
  role: string;
}
