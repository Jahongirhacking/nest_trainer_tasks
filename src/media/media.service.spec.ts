import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FakeStorageService } from '../../test/helpers/fake-storage.js';
import { InMemoryRepository } from '../../test/helpers/in-memory-repository.js';
import {
  jpegFile,
  memoryFile,
  pdfFile,
  pngFile,
  validJpeg,
} from '../../test/helpers/media-fixtures.js';
import { STORAGE_SERVICE } from '../storage/tokens/storage.tokens.js';
import { Media } from './entities/media.entity.js';
import { MediaCategory } from './enums/media-category.enum.js';
import { MediaStatus } from './enums/media-status.enum.js';
import type { MediaActor } from './interfaces/media.interface.js';
import { UPLOAD_LIMITS } from './media.constants.js';
import { MediaService } from './media.service.js';

/**
 * Modules A, D, F, G and H at SERVICE level: a fake repository and a fake
 * storage, no database, no disk, no HTTP. See the comment on MediaService for
 * the policies these tests encode.
 */
const owner: MediaActor = { id: 1, role: 'user' };
const stranger: MediaActor = { id: 2, role: 'user' };
const admin: MediaActor = { id: 3, role: 'admin' };

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
  return Buffer.concat(chunks);
}

describe('MediaService', () => {
  let service: MediaService;
  let repo: InMemoryRepository;
  let storage: FakeStorageService;

  beforeEach(async () => {
    repo = new InMemoryRepository();
    storage = new FakeStorageService();
    const moduleRef = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: getRepositoryToken(Media), useValue: repo },
        { provide: STORAGE_SERVICE, useValue: storage },
        { provide: UPLOAD_LIMITS, useValue: { maxFileSizeBytes: 2048, maxFiles: 3 } },
      ],
    }).compile();
    service = moduleRef.get(MediaService);
  });

  const upload = (actor: MediaActor, spec = jpegFile()) =>
    service.uploadOne(actor, memoryFile(spec));
  const liveRows = () =>
    repo.rows.filter((r) =>
      [MediaStatus.ACTIVE, MediaStatus.UPLOADING].includes(r.status),
    );

  describe('uploadOne()', () => {
    it('stores the bytes and returns ACTIVE metadata', async () => {
      const result = await upload(owner, jpegFile('holiday.jpg'));
      expect(result).toMatchObject({
        originalName: 'holiday.jpg',
        mimeType: 'image/jpeg',
        extension: 'jpg',
        size: validJpeg().length,
        category: MediaCategory.IMAGE,
        status: MediaStatus.ACTIVE,
      });
      expect(result.id).toBeDefined();
      expect(storage.count).toBe(1);
    });

    it('derives category and extension from the validated type', async () => {
      expect((await upload(owner, pdfFile())).category).toBe(MediaCategory.DOCUMENT);
      expect((await upload(owner, pngFile())).extension).toBe('png');
    });

    it('never exposes the storage key, a path or the owner id', async () => {
      const result = await upload(owner);
      const json = JSON.stringify(result);
      expect(result).not.toHaveProperty('storageKey');
      expect(result).not.toHaveProperty('uploadedById');
      for (const key of storage.objects.keys()) expect(json).not.toContain(key);
    });

    it('remembers the owner and the storage key in the database', async () => {
      await upload(owner);
      const row = repo.rows[0];
      expect(row.uploadedById).toBe(owner.id);
      expect([...storage.objects.keys()]).toContain(row.storageKey);
    });

    it('leaves nothing behind when the storage fails', async () => {
      storage.failUploadAt = 1;
      const error = await upload(owner).catch((e: Error) => e);
      expect(error).toBeInstanceOf(Error);
      expect(storage.count).toBe(0);
      expect(liveRows()).toHaveLength(0);
    });

    it('does not leak storage details in the error it throws', async () => {
      storage.failUploadAt = 1;
      const error = (await upload(owner).catch((e: Error) => e)) as Error;
      expect(error.message).not.toMatch(/ENOSPC|\/var\/secret/);
    });

    it('removes the stored object when the database fails afterwards', async () => {
      const original = repo.save.getMockImplementation()!;
      repo.save.mockImplementation(async (entity: Record<string, unknown>) => {
        if (storage.count > 0) throw new Error('connection to /var/run/pg lost');
        return original(entity);
      });
      const error = (await upload(owner).catch((e: Error) => e)) as Error;
      expect(error).toBeInstanceOf(Error);
      expect(error.message).not.toContain('/var/run/pg');
      expect(storage.count).toBe(0);
      expect(liveRows()).toHaveLength(0);
    });

    it('leaves nothing behind when the database fails before anything is stored', async () => {
      repo.save.mockRejectedValue(new Error('db down'));
      await expect(upload(owner)).rejects.toBeInstanceOf(Error);
      expect(storage.count).toBe(0);
    });
  });

  describe('uploadMany()', () => {
    const three = () => [jpegFile(), pngFile(), pdfFile()].map((s) => memoryFile(s));

    it('stores every file and associates it with the caller', async () => {
      const result = await service.uploadMany(owner, three());
      expect(result).toHaveLength(3);
      expect(result.every((m) => m.status === MediaStatus.ACTIVE)).toBe(true);
      expect(storage.count).toBe(3);
      expect(repo.rows.every((r) => r.uploadedById === owner.id)).toBe(true);
    });

    it('is all-or-nothing when the storage fails on the second file', async () => {
      storage.failUploadAt = 2;
      await expect(service.uploadMany(owner, three())).rejects.toBeInstanceOf(Error);
      expect(storage.count).toBe(0);
      expect(liveRows()).toHaveLength(0);
    });

    it('is all-or-nothing when the storage fails on the last file', async () => {
      storage.failUploadAt = 3;
      await expect(service.uploadMany(owner, three())).rejects.toBeInstanceOf(Error);
      expect(storage.count).toBe(0);
      expect(liveRows()).toHaveLength(0);
    });

    it('rejects an empty list with a BadRequestException', async () => {
      await expect(service.uploadMany(owner, [])).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects more files than the limit before storing anything', async () => {
      const files = Array.from({ length: 4 }, () => memoryFile(jpegFile()));
      await expect(service.uploadMany(owner, files)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(storage.count).toBe(0);
    });
  });

  describe('list()', () => {
    it('returns only the ACTIVE files of the caller', async () => {
      await upload(owner);
      await upload(owner, pngFile());
      await upload(stranger);
      repo.seed({ uploadedById: owner.id, status: MediaStatus.FAILED, originalName: 'f.jpg' });
      const result = await service.list(owner, { page: 1, limit: 10 });
      expect(result).toHaveLength(2);
      expect(result.every((m) => m.status === MediaStatus.ACTIVE)).toBe(true);
    });

    it('filters by category', async () => {
      await upload(owner);
      await upload(owner, pdfFile());
      const docs = await service.list(owner, {
        category: MediaCategory.DOCUMENT,
        page: 1,
        limit: 10,
      });
      expect(docs).toHaveLength(1);
      expect(docs[0].category).toBe(MediaCategory.DOCUMENT);
    });

    it('paginates', async () => {
      for (let i = 0; i < 5; i++) await upload(owner);
      expect(await service.list(owner, { page: 1, limit: 2 })).toHaveLength(2);
      expect(await service.list(owner, { page: 3, limit: 2 })).toHaveLength(1);
    });

    it('never contains storage keys', async () => {
      await upload(owner);
      const [item] = await service.list(owner, { page: 1, limit: 10 });
      expect(item).not.toHaveProperty('storageKey');
    });
  });

  describe('ownership', () => {
    it('lets the owner read the metadata', async () => {
      const { id } = await upload(owner);
      await expect(service.getMetadata(owner, id)).resolves.toMatchObject({ id });
    });

    it('answers NotFoundException (not Forbidden) to someone else', async () => {
      const { id } = await upload(owner);
      await expect(service.getMetadata(stranger, id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.download(stranger, id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.remove(stranger, id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(storage.count).toBe(1);
    });

    it('lets an ADMIN read and download any file', async () => {
      const { id } = await upload(owner);
      await expect(service.getMetadata(admin, id)).resolves.toMatchObject({ id });
      await expect(service.download(admin, id)).resolves.toBeDefined();
    });

    it('answers NotFoundException for an unknown id', async () => {
      await expect(service.getMetadata(owner, 'does-not-exist')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('does not show a file that is not ACTIVE', async () => {
      const row = repo.seed({
        uploadedById: owner.id,
        status: MediaStatus.UPLOADING,
        storageKey: 'fake/x',
        originalName: 'x.jpg',
      });
      await expect(
        service.getMetadata(owner, row.id as string),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('download()', () => {
    it('returns the stored bytes with the validated type', async () => {
      const spec = jpegFile('pic.jpg', 300);
      const { id } = await service.uploadOne(owner, memoryFile(spec));
      const result = await service.download(owner, id);
      expect(await streamToBuffer(result.stream)).toEqual(spec.buffer);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.size).toBe(spec.buffer.length);
      expect(result.originalName).toBe('pic.jpg');
    });

    it('answers NotFoundException when the metadata exists but the object is gone', async () => {
      const { id } = await upload(owner);
      storage.objects.clear();
      await expect(service.download(owner, id)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove()', () => {
    it('deletes the stored object and the metadata', async () => {
      const { id } = await upload(owner);
      await service.remove(owner, id);
      expect(storage.count).toBe(0);
      await expect(service.getMetadata(owner, id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lets an ADMIN delete any file', async () => {
      const { id } = await upload(owner);
      await service.remove(admin, id);
      expect(storage.count).toBe(0);
    });

    it('still succeeds when the stored object is already missing', async () => {
      const { id } = await upload(owner);
      storage.objects.clear();
      await expect(service.remove(owner, id)).resolves.toBeUndefined();
      await expect(service.getMetadata(owner, id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('keeps the metadata (so a retry is possible) when the storage delete fails', async () => {
      const { id } = await upload(owner);
      storage.failDelete = true;
      const error = (await service.remove(owner, id).catch((e: Error) => e)) as Error;
      expect(error).toBeInstanceOf(Error);
      expect(error.message).not.toMatch(/EACCES|\/var\/secret/);
      storage.failDelete = false;
      await expect(service.getMetadata(owner, id)).resolves.toMatchObject({ id });
      expect(storage.count).toBe(1);
    });
  });
});
