import { Test } from '@nestjs/testing';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import type { Project } from './entities/project.entity.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

const sample = (overrides: Partial<Project> = {}): Project => ({
  id: 1,
  name: 'Sample',
  description: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides,
});

const settle = async <T>(fn: () => T | Promise<T>): Promise<T> =>
  await Promise.resolve().then(fn);

describe('ProjectsController', () => {
  let controller: ProjectsController;
  // ProjectsService is fully mocked: no database, no repository.
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
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: service }],
    }).compile();
    controller = moduleRef.get(ProjectsController);
  });

  it('is created by the Nest container with ProjectsService injected', () => {
    expect(Object.values(controller)).toContain(service);
  });

  it('create delegates to ProjectsService.create', async () => {
    const dto = { name: 'New' } as CreateProjectDto;
    service.create.mockReturnValue(sample());
    expect(await settle(() => controller.create(dto))).toEqual(sample());
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('findAll delegates to ProjectsService.findAll', async () => {
    service.findAll.mockReturnValue([sample()]);
    expect(await settle(() => controller.findAll())).toEqual([sample()]);
    expect(service.findAll).toHaveBeenCalledTimes(1);
  });

  it('findOne delegates with the numeric id', async () => {
    service.findOne.mockReturnValue(sample({ id: 5 }));
    expect(await settle(() => controller.findOne(5))).toEqual(
      sample({ id: 5 }),
    );
    expect(service.findOne).toHaveBeenCalledWith(5);
  });

  it('update delegates with id and dto', async () => {
    const dto = { name: 'Renamed' } as UpdateProjectDto;
    service.update.mockReturnValue(sample({ name: 'Renamed' }));
    await settle(() => controller.update(2, dto));
    expect(service.update).toHaveBeenCalledWith(2, dto);
  });

  it('remove delegates with the id', async () => {
    service.remove.mockReturnValue(undefined);
    await settle(() => controller.remove(3));
    expect(service.remove).toHaveBeenCalledWith(3);
  });

  it('propagates errors thrown by the service', async () => {
    const error = new Error('boom');
    service.findOne.mockImplementation(() => {
      throw error;
    });
    await expect(settle(() => controller.findOne(1))).rejects.toBe(error);
  });
});
