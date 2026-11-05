import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listFiles } from '../../../test/helpers/media-app.js';
import {
  InvalidStorageKeyError,
  StorageObjectNotFoundError,
} from '../storage.errors.js';
import { LocalStorageService } from './local-storage.service.js';

/**
 * Module E: the local disk implementation. Everything happens in a throw-away
 * directory; `parent/sentinel.txt` stands for "a file the service must never
 * touch" (it sits OUTSIDE the storage root).
 */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
  return Buffer.concat(chunks);
}

describe('LocalStorageService', () => {
  let parent: string;
  let root: string;
  let storage: LocalStorageService;
  const data = Buffer.from('some file content');
  const input = { data, contentType: 'image/png', extension: 'png' };

  beforeEach(async () => {
    parent = await mkdtemp(join(tmpdir(), 'trainer-storage-'));
    root = join(parent, 'store');
    await writeFile(join(parent, 'sentinel.txt'), 'do not touch');
    storage = new LocalStorageService({ driver: 'local', localRoot: root });
  });
  afterEach(async () => {
    await rm(parent, { recursive: true, force: true });
  });

  const sentinelIntact = async () =>
    expect(await readFile(join(parent, 'sentinel.txt'), 'utf8')).toBe('do not touch');

  describe('upload()', () => {
    it('stores the content and returns a key and the size', async () => {
      const stored = await storage.upload(input);
      expect(stored.key).toBeTypeOf('string');
      expect(stored.key.length).toBeGreaterThan(0);
      expect(stored.size).toBe(data.length);
      expect(await streamToBuffer(await storage.read(stored.key))).toEqual(data);
    });

    it('creates the root directory when it does not exist yet', async () => {
      await storage.upload(input);
      expect((await listFiles(root)).length).toBe(1);
    });

    it('returns a key made of safe characters only, relative and without ".."', async () => {
      const { key } = await storage.upload(input);
      expect(key).toMatch(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/);
      expect(key).not.toContain('..');
      expect(key.startsWith('/')).toBe(false);
    });

    it('never uses client-provided names: keys are unique and unpredictable', async () => {
      const keys = new Set<string>();
      for (let i = 0; i < 25; i++) keys.add((await storage.upload(input)).key);
      expect(keys.size).toBe(25);
    });

    it('does not overwrite: same content twice gives two objects', async () => {
      const a = await storage.upload(input);
      const b = await storage.upload(input);
      expect(a.key).not.toBe(b.key);
      expect((await listFiles(root)).length).toBe(2);
    });

    it('survives many concurrent uploads without collisions', async () => {
      const results = await Promise.all(
        Array.from({ length: 30 }, (_, i) =>
          storage.upload({ ...input, data: Buffer.from(`content ${i}`) }),
        ),
      );
      expect(new Set(results.map((r) => r.key)).size).toBe(30);
      expect((await listFiles(root)).length).toBe(30);
    });

    it.each([
      ['../../escape'],
      ['jpg/../../../escape'],
      ['/etc/cron.d/x'],
      ['jpg\0.php'],
      ['a\\..\\..\\b'],
    ])('cannot be steered out of the root through the extension %j', async (extension) => {
      try {
        await storage.upload({ ...input, extension });
      } catch {
        // Rejecting a hostile extension is fine too.
      }
      // Nothing but the root and the sentinel may exist in the parent.
      expect(await listFiles(parent)).toSatisfy((files: string[]) =>
        files.every((f) => f === 'sentinel.txt' || f.startsWith('store/')),
      );
      await sentinelIntact();
    });

    it('fails when the storage cannot be written, without hanging', async () => {
      const blocker = join(parent, 'a-file');
      await writeFile(blocker, 'x');
      const broken = new LocalStorageService({
        driver: 'local',
        localRoot: join(blocker, 'store'),
      });
      await expect(broken.upload(input)).rejects.toBeInstanceOf(Error);
    });
  });

  describe('exists()', () => {
    it('is true for a stored object and false for a deleted one', async () => {
      const { key } = await storage.upload(input);
      expect(await storage.exists(key)).toBe(true);
      await storage.delete(key);
      expect(await storage.exists(key)).toBe(false);
    });
  });

  describe('delete()', () => {
    it('removes only the requested object', async () => {
      const a = await storage.upload(input);
      const b = await storage.upload(input);
      await storage.delete(a.key);
      expect(await storage.exists(a.key)).toBe(false);
      expect(await storage.exists(b.key)).toBe(true);
    });

    it('is idempotent: a missing object is not an error', async () => {
      const { key } = await storage.upload(input);
      await storage.delete(key);
      await expect(storage.delete(key)).resolves.toBeUndefined();
    });
  });

  describe('read()', () => {
    it('rejects with StorageObjectNotFoundError for a missing object', async () => {
      const { key } = await storage.upload(input);
      await storage.delete(key);
      await expect(storage.read(key)).rejects.toBeInstanceOf(StorageObjectNotFoundError);
    });
  });

  describe('path traversal', () => {
    const hostileKeys = [
      ['parent directory', '../sentinel.txt'],
      ['deep parent directory', '../../../../etc/passwd'],
      ['absolute path', '/etc/passwd'],
      ['hidden traversal', 'ab/../../sentinel.txt'],
      ['backslash traversal', 'ab\\..\\..\\sentinel.txt'],
      ['empty key', ''],
      ['dot', '.'],
      ['double dot', '..'],
      ['NUL byte', 'ab\0cd'],
      ['encoded traversal', '..%2f..%2fsentinel.txt'],
    ] as const;

    it.each(hostileKeys)('exists() rejects a %s key', async (_label, key) => {
      await expect(storage.exists(key)).rejects.toBeInstanceOf(InvalidStorageKeyError);
    });
    it.each(hostileKeys)('read() rejects a %s key', async (_label, key) => {
      await expect(storage.read(key)).rejects.toBeInstanceOf(InvalidStorageKeyError);
    });
    it.each(hostileKeys)('delete() rejects a %s key and deletes nothing', async (_label, key) => {
      await expect(storage.delete(key)).rejects.toBeInstanceOf(InvalidStorageKeyError);
      await sentinelIntact();
    });

    it('does not follow a symbolic link out of the root', async () => {
      const outside = join(parent, 'outside');
      await mkdir(outside);
      await writeFile(join(outside, 'secret.txt'), 'top secret');
      await mkdir(root, { recursive: true });
      await symlink(outside, join(root, 'link'));
      const reachable = async (fn: () => Promise<unknown>) => {
        try {
          await fn();
          return true;
        } catch {
          return false;
        }
      };
      expect(await reachable(() => storage.read('link/secret.txt'))).toBe(false);
      expect(await storage.exists('link/secret.txt').catch(() => false)).toBe(false);
      await storage.delete('link/secret.txt').catch(() => undefined);
      expect(await readFile(join(outside, 'secret.txt'), 'utf8')).toBe('top secret');
    });
  });
});
