import { Test } from '@nestjs/testing';
import type { Task } from './entities/task.entity.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

const sampleTask = (overrides: Partial<Task> = {}): Task => ({
  id: 1,
  title: 'Sample',
  description: 'Sample description',
  completed: false,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides,
});

// Works whether the controller method is sync or async.
const settle = async <T>(fn: () => T | Promise<T>): Promise<T> =>
  await Promise.resolve().then(fn);

describe('TasksController', () => {
  let controller: TasksController;
  // TasksService is fully mocked: these tests must not depend on how the
  // real service is implemented.
  const service = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: service }],
    }).compile();
    controller = moduleRef.get(TasksController);
  });

  it('is created by the Nest container with TasksService injected', () => {
    expect(controller).toBeInstanceOf(TasksController);
    expect(Object.values(controller)).toContain(service);
  });

  it('create delegates to TasksService.create', async () => {
    const dto = { title: 'New task', description: 'desc' };
    const created = sampleTask();
    service.create.mockReturnValue(created);

    const result = await settle(() => controller.create(dto));

    expect(service.create).toHaveBeenCalledTimes(1);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toBe(created);
  });

  it('findAll delegates to TasksService.findAll', async () => {
    const tasks = [sampleTask(), sampleTask({ id: 2 })];
    service.findAll.mockReturnValue(tasks);

    const result = await settle(() => controller.findAll());

    expect(service.findAll).toHaveBeenCalledTimes(1);
    expect(result).toBe(tasks);
  });

  it('findOne delegates to TasksService.findOne with the numeric id', async () => {
    const task = sampleTask({ id: 7 });
    service.findOne.mockReturnValue(task);

    const result = await settle(() => controller.findOne(7));

    expect(service.findOne).toHaveBeenCalledTimes(1);
    expect(service.findOne).toHaveBeenCalledWith(7);
    expect(result).toBe(task);
  });

  it('update delegates to TasksService.update with id and dto', async () => {
    const dto = { completed: true };
    const updated = sampleTask({ id: 3, completed: true });
    service.update.mockReturnValue(updated);

    const result = await settle(() => controller.update(3, dto));

    expect(service.update).toHaveBeenCalledTimes(1);
    expect(service.update).toHaveBeenCalledWith(3, dto);
    expect(result).toBe(updated);
  });

  it('remove delegates to TasksService.remove with the id', async () => {
    service.remove.mockReturnValue(undefined);

    await settle(() => controller.remove(5));

    expect(service.remove).toHaveBeenCalledTimes(1);
    expect(service.remove).toHaveBeenCalledWith(5);
  });

  it('propagates errors thrown by the service', async () => {
    const error = new Error('boom');
    service.findOne.mockImplementation(() => {
      throw error;
    });
    await expect(
      Promise.resolve().then(() => controller.findOne(1)),
    ).rejects.toBe(error);
  });

  it('does not keep its own task store (always reflects the service)', async () => {
    service.findAll.mockReturnValueOnce([sampleTask()]);
    expect(await settle(() => controller.findAll())).toHaveLength(1);

    service.findAll.mockReturnValueOnce([]);
    expect(await settle(() => controller.findAll())).toEqual([]);

    const arrayFields = Object.values(controller).filter(Array.isArray);
    expect(arrayFields).toHaveLength(0);
  });
});
