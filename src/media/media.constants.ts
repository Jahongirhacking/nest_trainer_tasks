import { MediaCategory } from './enums/media-category.enum.js';

/** Multipart field names the API accepts. Anything else is rejected. */
export const SINGLE_FILE_FIELD = 'file';
export const MULTIPLE_FILES_FIELD = 'files';

/** Injection token for the validated `UploadLimits`. */
export const UPLOAD_LIMITS = Symbol('UPLOAD_LIMITS');

/**
 * The ONLY file types the service accepts: MIME type <-> extensions <->
 * category. Everything else is rejected. This is the single source of truth
 * the validators and the entity must share.
 */
export interface AllowedMediaType {
  readonly mimeType: string;
  readonly extensions: readonly string[];
  readonly category: MediaCategory;
}

export const ALLOWED_MEDIA_TYPES: readonly AllowedMediaType[] = [
  { mimeType: 'image/jpeg', extensions: ['jpg', 'jpeg'], category: MediaCategory.IMAGE },
  { mimeType: 'image/png', extensions: ['png'], category: MediaCategory.IMAGE },
  { mimeType: 'image/webp', extensions: ['webp'], category: MediaCategory.IMAGE },
  { mimeType: 'application/pdf', extensions: ['pdf'], category: MediaCategory.DOCUMENT },
];
