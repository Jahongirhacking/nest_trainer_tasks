/** The key is not one this storage could have generated (traversal, absolute...). */
export class InvalidStorageKeyError extends Error {
  constructor(message = 'Invalid storage key') {
    super(message);
    this.name = 'InvalidStorageKeyError';
  }
}

/** `read()` of an object that does not exist. */
export class StorageObjectNotFoundError extends Error {
  constructor(message = 'Storage object not found') {
    super(message);
    this.name = 'StorageObjectNotFoundError';
  }
}
