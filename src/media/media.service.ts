import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { UploadedFileLike } from '../common/validators/uploaded-file.interface.js';
import type { StorageService } from '../storage/interfaces/storage-service.interface.js';
import { STORAGE_SERVICE } from '../storage/tokens/storage.tokens.js';
import { Media } from './entities/media.entity.js';
import type { MediaCategory } from './enums/media-category.enum.js';
import type {
  MediaActor,
  MediaDownload,
  MediaMetadata,
  UploadLimits,
} from './interfaces/media.interface.js';
import { UPLOAD_LIMITS } from './media.constants.js';

/**
 * Business logic of the media feature. It knows `StorageService` (the
 * interface) and the repository, never the filesystem and never Express.
 *
 * Policies the tests enforce (write your decisions in your notes):
 *  - Upload: the row is created UPLOADING, the bytes are stored, and only then
 *    the row becomes ACTIVE. After ANY failed upload there is no ACTIVE or
 *    UPLOADING row and no object left in storage (a FAILED row is allowed).
 *  - Several files: all-or-nothing. If one file fails, the objects already
 *    stored for the others are removed and none of them is ACTIVE.
 *  - Access: a user sees only their own files; someone else's file looks like
 *    it does not exist (NotFoundException). ADMIN may read and delete any file.
 *  - Delete: removes the stored object, then the row. A storage object that is
 *    already missing is not an error (the delete still succeeds).
 *  - Errors that reach the controller never contain paths or driver messages.
 *
 * Test double limits (media.service.spec.ts): the fake repository supports
 * only create, save, find, findOne, findOneBy, remove and count, with plain
 * equality in `where`. Extending that fake is fine; weakening a test is not.
 *
 * TODO: Implement every method.
 */
@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media) private readonly mediaRepository: Repository<Media>,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    @Inject(UPLOAD_LIMITS) private readonly limits: UploadLimits,
  ) {}

  /** Stores one ALREADY VALIDATED file and returns its metadata. */
  async uploadOne(
    _actor: MediaActor,
    _file: UploadedFileLike,
  ): Promise<MediaMetadata> {
    void this.mediaRepository;
    void this.storage;
    void this.limits;
    throw new Error('Not implemented');
  }

  /** All-or-nothing upload of several validated files. */
  async uploadMany(
    _actor: MediaActor,
    _files: UploadedFileLike[],
  ): Promise<MediaMetadata[]> {
    throw new Error('Not implemented');
  }

  /** ACTIVE files of the actor, newest first. */
  async list(
    _actor: MediaActor,
    _query: { category?: MediaCategory; page: number; limit: number },
  ): Promise<MediaMetadata[]> {
    throw new Error('Not implemented');
  }

  async getMetadata(_actor: MediaActor, _id: string): Promise<MediaMetadata> {
    throw new Error('Not implemented');
  }

  async download(_actor: MediaActor, _id: string): Promise<MediaDownload> {
    throw new Error('Not implemented');
  }

  async remove(_actor: MediaActor, _id: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
