/**
 * UPLOADING -> ACTIVE on success, UPLOADING -> FAILED on failure.
 * Only ACTIVE files are visible through the API.
 */
export enum MediaStatus {
  UPLOADING = 'UPLOADING',
  ACTIVE = 'ACTIVE',
  FAILED = 'FAILED',
}
