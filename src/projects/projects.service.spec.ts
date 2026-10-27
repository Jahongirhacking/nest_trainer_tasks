import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  createFakeRepositories,
  type FakeRepository,
} from '../../test/helpers/fake-repository.js';
import { Task } from '../tasks/entities/task.entity.js';
import { Project } from './entities/project.entity.js';
import { ProjectsService } from './projects.service.js';

// Works whether the service method is sync or async.
const settle = async <T>(fn: () => T | Promise<T>): Promise<T> =>
  await Promise.resolve().then(fn);

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projects: FakeRepository;
  let tasks: FakeRepository;

  beforeEach(async () => {
    const fakes = createFakeRepositories();
    projects = fakes.projects;
    tasks = fakes.tasks;
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getRepositoryToken(Project), useValue: projects },
        { provide: getRepositoryToken(Task), useValue: tasks },
      ],
    }).compile();
    service = moduleRef.get(ProjectsService);
  });

  it('is built by Nest with the Project repository injected', () => {
    expect(Object.values(service)).toContain(projects);
  });

  describe('create', () => {
    it('persists the project through the repository', async () => {
      const created = await settle(() =>
        service.create({ name: 'Backend', description: 'API work' }),
      );
      expect(created).toMatchObject({ name: 'Backend', description: 'API work' });
      expect(typeof created.id).toBe('number');
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(projects.rows).toHaveLength(1);
      expect(projects.rows[0].name).toBe('Backend');
    });

    it('rejects a duplicate name with ConflictException', async () => {
      await settle(() => service.create({ name: 'Backend' }));
      await expect(settle(() => service.create({ name: 'Backend' }))).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(projects.rows).toHaveLength(1);
    });

    it('does NOT turn unexpected database errors into a conflict', async () => {
      const boom = new Error('connection terminated');
      projects.save.mockRejectedValueOnce(boom);
      projects.insert.mockRejectedValueOnce(boom);
      await expect(settle(() => service.create({ name: 'X' }))).rejects.toBe(boom);
    });
  });

  describe('findAll / findOne', () => {
    it('returns an empty array when there are no projects', async () => {
      expect(await settle(() => service.findAll())).toEqual([]);
    });

    it('lists stored projects', async () => {
      await service.create({ name: 'A' });
      await service.create({ name: 'B' });
      const all = await settle(() => service.findAll());
      expect(all.map((p) => p.name).sort()).toEqual(['A', 'B']);
    });

    it('returns an existing project', async () => {
      const { id } = await service.create({ name: 'A' });
      expect(await settle(() => service.findOne(id))).toMatchObject({ id, name: 'A' });
    });

    it('throws NotFoundException for a missing project', async () => {
      await expect(settle(() => service.findOne(999))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates the given fields only', async () => {
      const { id } = await service.create({ name: 'A', description: 'keep' });
      const updated = await settle(() => service.update(id, { name: 'B' }));
      expect(updated).toMatchObject({ id, name: 'B', description: 'keep' });
      expect(projects.rows[0].name).toBe('B');
    });

    it('throws NotFoundException for a missing project', async () => {
      await expect(
        settle(() => service.update(999, { name: 'B' })),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when another project has that name', async () => {
      await service.create({ name: 'A' });
      const b = await service.create({ name: 'B' });
      await expect(
        settle(() => service.update(b.id, { name: 'A' })),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows keeping the project\'s own name', async () => {
      const a = await service.create({ name: 'A' });
      await expect(
        settle(() => service.update(a.id, { name: 'A', description: 'x' })),
      ).resolves.toMatchObject({ name: 'A', description: 'x' });
    });
  });

  describe('remove', () => {
    it('deletes an empty project', async () => {
      const { id } = await service.create({ name: 'A' });
      await settle(() => service.remove(id));
      expect(projects.rows).toHaveLength(0);
    });

    it('throws NotFoundException for a missing project', async () => {
      await expect(settle(() => service.remove(999))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects deleting a project that has tasks (ConflictException) and keeps everything', async () => {
      const { id } = await service.create({ name: 'A' });
      await tasks.save({ title: 'T', projectId: id });
      await expect(settle(() => service.remove(id))).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(projects.rows).toHaveLength(1);
      expect(tasks.rows).toHaveLength(1);
    });

    it('still reports a conflict if a task appears between the check and the delete', async () => {
      const { id } = await service.create({ name: 'A' });
      // Simulates the race: the database refuses the delete (FK violation)
      // even though an earlier application-level check saw no tasks.
      projects.db.beforeWrite = () => {
        projects.db.beforeWrite = undefined;
        projects.db.tasks.push({ id: 99, title: 'late', projectId: id });
      };
      await expect(settle(() => service.remove(id))).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(projects.rows).toHaveLength(1);
    });
  });
});
