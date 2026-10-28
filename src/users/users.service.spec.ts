import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FakeUserRepository } from '../../test/helpers/fake-user-repository.js';
import { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';

// Works whether the service method is sync or async.
const settle = async <T>(fn: () => T | Promise<T>): Promise<T> =>
  await Promise.resolve().then(fn);

describe('UsersService', () => {
  let service: UsersService;
  let users: FakeUserRepository;

  beforeEach(async () => {
    users = new FakeUserRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: users },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it('is built by Nest with the User repository injected', () => {
    expect(Object.values(service)).toContain(users);
  });

  describe('create', () => {
    it('persists the user through the repository and returns it', async () => {
      const created = await settle(() =>
        service.create({ email: 'a@example.com', passwordHash: 'hash-value' }),
      );
      expect(created).toMatchObject({ email: 'a@example.com' });
      expect(typeof created.id).toBe('number');
      expect(users.rows).toHaveLength(1);
      expect(users.rows[0].passwordHash).toBe('hash-value');
    });

    it('rejects a duplicate email with ConflictException', async () => {
      await settle(() =>
        service.create({ email: 'a@example.com', passwordHash: 'h1' }),
      );
      await expect(
        settle(() =>
          service.create({ email: 'a@example.com', passwordHash: 'h2' }),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(users.rows).toHaveLength(1);
    });

    it('does not translate unknown database errors into conflicts', async () => {
      users.beforeWrite = () => {
        throw new Error('connection lost');
      };
      const failure = await settle(() =>
        service.create({ email: 'a@example.com', passwordHash: 'h' }),
      ).catch((error: unknown) => error);
      expect(failure).not.toBeInstanceOf(ConflictException);
      expect((failure as Error).message).toBe('connection lost');
    });
  });

  describe('findByEmail', () => {
    it('finds a stored user by its exact email', async () => {
      await settle(() =>
        service.create({ email: 'a@example.com', passwordHash: 'h' }),
      );
      const found = await settle(() => service.findByEmail('a@example.com'));
      expect(found).toMatchObject({ email: 'a@example.com' });
    });

    it('returns null for an unknown email', async () => {
      await expect(
        settle(() => service.findByEmail('nobody@example.com')),
      ).resolves.toBeNull();
    });
  });

  describe('findById', () => {
    it('finds a stored user by id', async () => {
      const { id } = await settle(() =>
        service.create({ email: 'a@example.com', passwordHash: 'h' }),
      );
      await expect(settle(() => service.findById(id))).resolves.toMatchObject({
        id,
        email: 'a@example.com',
      });
    });

    it('returns null for an unknown id', async () => {
      await expect(settle(() => service.findById(999))).resolves.toBeNull();
    });
  });
});
