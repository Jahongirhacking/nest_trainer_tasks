import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  createFakeRepositories,
  type FakeRepository,
} from '../../test/helpers/fake-repository.js';
import { Project } from '../projects/entities/project.entity.js';
import { ProjectsService } from '../projects/projects.service.js';
import { Task } from './entities/task.entity.js';
import { TasksService } from './tasks.service.js';

// Works whether the service method is sync or async.
const settle = async <T>(fn: () => T | Promise<T>): Promise<T> =>
  await Promise.resolve().then(fn);

describe('TasksService', () => {
  let service: TasksService;
  let projects: FakeRepository;
  let tasks: FakeRepository;

  const seedProject = async (name: string) =>
    (await projects.save({ name })) as { id: number };

  beforeEach(async () => {
    const fakes = createFakeRepositories();
    projects = fakes.projects;
    tasks = fakes.tasks;
    // ProjectsService is offered too, so you may verify the parent project
    // either through it or through the Project repository directly.
    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        ProjectsService,
        { provide: getRepositoryToken(Task), useValue: tasks },
        { provide: getRepositoryToken(Project), useValue: projects },
      ],
    }).compile();
    service = moduleRef.get(TasksService);
  });

  it('is built by Nest with the Task repository injected', () => {
    expect(Object.values(service)).toContain(tasks);
  });

  describe('create', () => {
    it('persists a task for an existing project through the repository', async () => {
      const project = await seedProject('P');
      const task = await settle(() =>
        service.create(project.id, { title: 'Write tests', description: 'd' }),
      );
      expect(task).toMatchObject({
        title: 'Write tests',
        description: 'd',
        completed: false,
        projectId: project.id,
      });
      expect(typeof task.id).toBe('number');
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
      expect(tasks.rows).toHaveLength(1);
    });

    it('throws NotFoundException when the project does not exist', async () => {
      await expect(
        settle(() => service.create(999, { title: 'Orphan' })),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tasks.rows).toHaveLength(0);
    });

    it('does not let the DTO smuggle in id / timestamps / projectId', async () => {
      const a = await seedProject('A');
      const b = await seedProject('B');
      const evil = {
        title: 'Sneaky',
        id: 777,
        projectId: b.id,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      } as any;
      const task = await settle(() => service.create(a.id, evil));
      expect(task.projectId).toBe(a.id);
      expect(task.id).not.toBe(777);
      expect(task.createdAt.getTime()).toBeGreaterThan(0);
    });
  });

  describe('findAll / findAllByProject', () => {
    it('returns an empty array when nothing is stored', async () => {
      expect(await settle(() => service.findAll())).toEqual([]);
    });

    it('lists every task', async () => {
      const a = await seedProject('A');
      const b = await seedProject('B');
      await service.create(a.id, { title: 'one' });
      await service.create(b.id, { title: 'two' });
      expect(await settle(() => service.findAll())).toHaveLength(2);
    });

    it('lists only the tasks of the requested project', async () => {
      const a = await seedProject('A');
      const b = await seedProject('B');
      await service.create(a.id, { title: 'in A' });
      await service.create(b.id, { title: 'in B' });
      const result = await settle(() => service.findAllByProject(a.id));
      expect(result.map((t) => t.title)).toEqual(['in A']);
    });

    it('returns [] for an existing project without tasks', async () => {
      const a = await seedProject('A');
      expect(await settle(() => service.findAllByProject(a.id))).toEqual([]);
    });

    it('throws NotFoundException for a missing project', async () => {
      await expect(
        settle(() => service.findAllByProject(999)),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('returns an existing task', async () => {
      const p = await seedProject('A');
      const { id } = await service.create(p.id, { title: 'find me' });
      expect(await settle(() => service.findOne(id))).toMatchObject({
        id,
        title: 'find me',
      });
    });

    it('throws NotFoundException for a missing task', async () => {
      await expect(settle(() => service.findOne(999))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates the allowed fields and keeps the project', async () => {
      const p = await seedProject('A');
      const { id } = await service.create(p.id, { title: 'old' });
      const updated = await settle(() =>
        service.update(id, { title: 'new', completed: true }),
      );
      expect(updated).toMatchObject({
        id,
        title: 'new',
        completed: true,
        projectId: p.id,
      });
      expect(tasks.rows[0]).toMatchObject({ title: 'new', completed: true });
    });

    it('throws NotFoundException for a missing task', async () => {
      await expect(
        settle(() => service.update(999, { title: 'x' })),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an empty update', async () => {
      const p = await seedProject('A');
      const { id } = await service.create(p.id, { title: 'old' });
      await expect(settle(() => service.update(id, {}))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('cannot move a task to another project', async () => {
      const a = await seedProject('A');
      const b = await seedProject('B');
      const { id } = await service.create(a.id, { title: 'stay' });
      await settle(() =>
        service.update(id, { title: 'x', projectId: b.id } as any),
      );
      expect(tasks.rows[0].projectId).toBe(a.id);
    });
  });

  describe('remove', () => {
    it('deletes the task but not its project', async () => {
      const p = await seedProject('A');
      const { id } = await service.create(p.id, { title: 'bye' });
      await settle(() => service.remove(id));
      expect(tasks.rows).toHaveLength(0);
      expect(projects.rows).toHaveLength(1);
    });

    it('throws NotFoundException for a missing task', async () => {
      await expect(settle(() => service.remove(999))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
