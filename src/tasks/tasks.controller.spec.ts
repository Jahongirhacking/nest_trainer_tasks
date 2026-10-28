import { Test } from '@nestjs/testing';
import type { Task } from './entities/task.entity.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

const sample = (overrides: Partial<Task> = {}): Task => ({
  id: 1,
  title: 'Sample',
  description: null,
  completed: false,
  projectId: 1,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides,
});

const settle = async <T>(fn: () => T | Promise<T>): Promise<T> =>
  await Promise.resolve().then(fn);

describe('TasksController', () => {
  let controller: TasksController;
  const service = {
    create: vi.fn(),
    findAll: vi.fn(),
    findAllByProject: vi.fn(),
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
    expect(Object.values(controller)).toContain(service);
  });

  it('create delegates with the project id and dto', async () => {
    const dto = { title: 'New task' };
    service.create.mockReturnValue(sample());
    expect(await settle(() => controller.create(4, dto))).toEqual(sample());
    expect(service.create).toHaveBeenCalledWith(4, dto);
  });

  it('findAllByProject delegates with the project id', async () => {
    service.findAllByProject.mockReturnValue([sample()]);
    expect(await settle(() => controller.findAllByProject(4))).toEqual([
      sample(),
    ]);
    expect(service.findAllByProject).toHaveBeenCalledWith(4);
  });

  it('findAll delegates to TasksService.findAll', async () => {
    service.findAll.mockReturnValue([sample()]);
    expect(await settle(() => controller.findAll())).toEqual([sample()]);
  });

  it('findOne delegates with the id', async () => {
    service.findOne.mockReturnValue(sample({ id: 8 }));
    await settle(() => controller.findOne(8));
    expect(service.findOne).toHaveBeenCalledWith(8);
  });

  it('update delegates with id and dto', async () => {
    const dto = { completed: true };
    service.update.mockReturnValue(sample({ completed: true }));
    await settle(() => controller.update(8, dto));
    expect(service.update).toHaveBeenCalledWith(8, dto);
  });

  it('remove delegates with the id', async () => {
    service.remove.mockReturnValue(undefined);
    await settle(() => controller.remove(8));
    expect(service.remove).toHaveBeenCalledWith(8);
  });

  it('propagates errors thrown by the service', async () => {
    const error = new Error('boom');
    service.remove.mockImplementation(() => {
      throw error;
    });
    await expect(settle(() => controller.remove(1))).rejects.toBe(error);
  });
});
