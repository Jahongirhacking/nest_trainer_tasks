import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TasksService } from './tasks.service.js';

// Works whether the service method is sync or async, and whether it throws
// or rejects.
const settle = async <T>(fn: () => T | Promise<T>): Promise<T> =>
  await Promise.resolve().then(fn);

describe('TasksService', () => {
  let service: TasksService;

  // A brand-new module (and therefore a brand-new service with empty storage)
  // for every test keeps the tests isolated.
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [TasksService],
    }).compile();
    service = moduleRef.get(TasksService);
  });

  describe('create', () => {
    it('assigns a numeric ID', async () => {
      const task = await settle(() => service.create({ title: 'Learn Nest' }));
      expect(typeof task.id).toBe('number');
      expect(Number.isInteger(task.id)).toBe(true);
      expect(task.id).toBeGreaterThan(0);
    });

    it('sets completed to false by default', async () => {
      const task = await settle(() => service.create({ title: 'Learn Nest' }));
      expect(task.completed).toBe(false);
    });

    it('sets a creation timestamp', async () => {
      const before = Date.now();
      const task = await settle(() => service.create({ title: 'Learn Nest' }));
      const after = Date.now();
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(task.createdAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('stores the title and optional description', async () => {
      const task = await settle(() =>
        service.create({ title: 'Learn Nest', description: 'Modules and DI' }),
      );
      expect(task.title).toBe('Learn Nest');
      expect(task.description).toBe('Modules and DI');
    });

    it('produces different IDs for multiple tasks', async () => {
      const a = await settle(() => service.create({ title: 'Task A' }));
      const b = await settle(() => service.create({ title: 'Task B' }));
      const c = await settle(() => service.create({ title: 'Task C' }));
      expect(new Set([a.id, b.id, c.id]).size).toBe(3);
    });
  });

  describe('findAll', () => {
    it('returns an empty array when no tasks exist', async () => {
      expect(await settle(() => service.findAll())).toEqual([]);
    });

    it('returns the stored tasks', async () => {
      const a = await settle(() => service.create({ title: 'Task A' }));
      const b = await settle(() => service.create({ title: 'Task B' }));
      const all = await settle(() => service.findAll());
      expect(all).toHaveLength(2);
      expect(all).toEqual(expect.arrayContaining([a, b]));
    });
  });

  describe('findOne', () => {
    it('returns the correct task', async () => {
      await settle(() => service.create({ title: 'Task A' }));
      const b = await settle(() => service.create({ title: 'Task B' }));
      const found = await settle(() => service.findOne(b.id));
      expect(found).toEqual(b);
      expect(found.title).toBe('Task B');
    });

    it('throws NotFoundException for a nonexistent task', async () => {
      await expect(settle(() => service.findOne(9999))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('changes only the specified properties', async () => {
      const created = await settle(() =>
        service.create({ title: 'Original', description: 'Keep me' }),
      );
      const updated = await settle(() =>
        service.update(created.id, { completed: true }),
      );
      expect(updated.completed).toBe(true);
      expect(updated.title).toBe('Original');
      expect(updated.description).toBe('Keep me');
      expect(updated.id).toBe(created.id);
      expect(updated.createdAt).toEqual(created.createdAt);

      const renamed = await settle(() =>
        service.update(created.id, { title: 'Renamed' }),
      );
      expect(renamed.title).toBe('Renamed');
      expect(renamed.completed).toBe(true);
      expect(renamed.description).toBe('Keep me');
    });

    it('persists the change', async () => {
      const created = await settle(() => service.create({ title: 'Original' }));
      await settle(() => service.update(created.id, { title: 'Changed' }));
      const found = await settle(() => service.findOne(created.id));
      expect(found.title).toBe('Changed');
    });

    it('does not touch other tasks', async () => {
      const a = await settle(() => service.create({ title: 'Task A' }));
      const b = await settle(() => service.create({ title: 'Task B' }));
      await settle(() => service.update(a.id, { title: 'Changed' }));
      expect(await settle(() => service.findOne(b.id))).toEqual(b);
    });

    it('throws NotFoundException for a nonexistent task', async () => {
      await expect(
        settle(() => service.update(9999, { title: 'Nope' })),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes an existing task', async () => {
      const a = await settle(() => service.create({ title: 'Task A' }));
      const b = await settle(() => service.create({ title: 'Task B' }));
      await settle(() => service.remove(a.id));

      await expect(settle(() => service.findOne(a.id))).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(await settle(() => service.findAll())).toEqual([b]);
    });

    it('throws NotFoundException for a nonexistent task', async () => {
      await expect(settle(() => service.remove(9999))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws NotFoundException when deleting the same task twice', async () => {
      const a = await settle(() => service.create({ title: 'Task A' }));
      await settle(() => service.remove(a.id));
      await expect(settle(() => service.remove(a.id))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
