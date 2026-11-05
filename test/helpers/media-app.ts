import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import type { UploadLimits } from '../../src/media/interfaces/media.interface.js';
import { UPLOAD_LIMITS } from '../../src/media/media.constants.js';
import { MediaModule } from '../../src/media/media.module.js';
import type { StorageConfig } from '../../src/storage/config/storage.config.js';
import { LocalStorageService } from '../../src/storage/services/local-storage.service.js';
import { FlakyStorage } from './flaky-storage.js';
import {
  STORAGE_CONFIG,
  STORAGE_SERVICE,
} from '../../src/storage/tokens/storage.tokens.js';
import { registerAndLogin } from './auth.js';

export const TEST_LIMITS: UploadLimits = { maxFileSizeBytes: 2048, maxFiles: 3 };

export interface MediaTestApp {
  app: INestApplication<App>;
  /** Isolated storage directory of THIS app. */
  root: string;
  /** Parent of `root`: nothing may ever appear here but `root` itself. */
  parent: string;
  /** The application's storage, wrapped so tests can make it fail. */
  storage: FlakyStorage;
  cleanup(): Promise<void>;
}

/**
 * The real application (PostgreSQL TEST database) + MediaModule, with:
 *  - the storage root in a fresh temp directory,
 *  - small upload limits so tests do not need big buffers,
 *  - optionally a different StorageService (for failure injection).
 * MediaModule is imported here so these tests do not depend on you having
 * registered it in AppModule (one separate test checks that).
 */
export async function createMediaTestApp(
  options: { limits?: UploadLimits } = {},
): Promise<MediaTestApp> {
  const parent = await mkdtemp(join(tmpdir(), 'trainer-media-'));
  const root = join(parent, 'store');
  let storage!: FlakyStorage;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule, MediaModule] })
    .overrideProvider(STORAGE_CONFIG)
    .useValue({ driver: 'local', localRoot: root })
    .overrideProvider(UPLOAD_LIMITS)
    .useValue(options.limits ?? TEST_LIMITS)
    .overrideProvider(STORAGE_SERVICE)
    .useFactory({
      factory: (config: StorageConfig) =>
        (storage = new FlakyStorage(new LocalStorageService(config))),
      inject: [STORAGE_CONFIG],
    })
    .compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>({
    logger: false,
  });
  configureApp(app);
  await app.init();
  return {
    app,
    root,
    parent,
    storage,
    cleanup: async () => {
      await app.close();
      await rm(parent, { recursive: true, force: true });
    },
  };
}

/** Relative paths of every regular file below `dir` (empty if it is missing). */
export async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (current: string, prefix: string): Promise<void> => {
    let entries: string[];
    try {
      entries = await readdir(current);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = join(current, name);
      const info = await stat(full);
      if (info.isDirectory()) await walk(full, `${prefix}${name}/`);
      else out.push(`${prefix}${name}`);
    }
  };
  await walk(dir, '');
  return out.sort();
}

/** Registers a user and returns the token and id. */
export async function newUser(app: INestApplication<App>) {
  const { token, user } = await registerAndLogin(app);
  return { token, id: user.id };
}

/** Registers a user and promotes them to ADMIN directly in the database. */
export async function newAdmin(app: INestApplication<App>) {
  const { token, user } = await registerAndLogin(app);
  await app.get(DataSource).query(`UPDATE "users" SET "role" = 'admin' WHERE "id" = $1`, [
    user.id,
  ]);
  return { token, id: user.id };
}

/** Rows of `media` that must not exist after a FAILED upload. */
export async function countLiveMedia(app: INestApplication<App>): Promise<number> {
  const rows: { n: string }[] = await app
    .get(DataSource)
    .query(`SELECT count(*) AS n FROM "media" WHERE "status" IN ('ACTIVE', 'UPLOADING')`);
  return Number(rows[0].n);
}
