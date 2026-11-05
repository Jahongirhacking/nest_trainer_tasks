import { Entity, PrimaryGeneratedColumn } from 'typeorm';
import { MediaCategory } from '../enums/media-category.enum.js';
import { MediaStatus } from '../enums/media-status.enum.js';

/**
 * Table `media`: METADATA of an uploaded file. The bytes live in the storage
 * layer, never in PostgreSQL.
 *
 * SCAFFOLDING: only the primary key is mapped so the module compiles and the
 * repository can be injected. The other properties are plain class fields
 * that TypeORM ignores until you decorate them.
 *
 * TODO: Map every column (see ASSIGNMENT.md, "Module F"):
 *   - `originalName`  untrusted display name, bounded length
 *   - `storageKey`    UNIQUE, NOT NULL, never returned by the API
 *   - `mimeType`, `extension`, `size` (bytes; think about the column type),
 *     `category`, `status` (default UPLOADING)
 *   - `uploadedById`  a REAL foreign key to `users` (ManyToOne) - decide and
 *     document ON DELETE
 *   - `createdAt` / `updatedAt` as `timestamptz`
 *   - CHECK constraints for `size >= 0` and the allowed `category` / `status`
 *     values; an index for "files of a user, newest first"
 * TODO: Keep `src/migrations/*-CreateMedia.ts` and this class in sync.
 */
@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  extension: string;
  size: number;
  category: MediaCategory;
  status: MediaStatus;
  uploadedById: number;
  createdAt: Date;
  updatedAt: Date;
}
