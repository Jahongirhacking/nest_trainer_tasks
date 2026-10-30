import type { INestApplication } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { configureApp } from '../../src/app.setup.js';
import { JWT_CONFIG } from '../../src/auth/auth.constants.js';
import { JwtStrategy } from '../../src/auth/strategies/jwt.strategy.js';
import { User } from '../../src/users/entities/user.entity.js';
import { UsersService } from '../../src/users/users.service.js';
import {
  signTestJwt,
  TEST_JWT_AUDIENCE,
  TEST_JWT_ISSUER,
  TEST_JWT_SECRET,
} from './jwt.js';
import { Role } from '../../src/rbac/enums/role.enum.js';
import { TaskStatus } from '../../src/rbac/enums/task-status.enum.js';
import { RbacModule } from '../../src/rbac/rbac.module.js';
import { RbacTask } from '../../src/rbac/tasks/entities/rbac-task.entity.js';
import { InMemoryRepository } from './in-memory-repository.js';

/** Ids of the seeded accounts. */
export const ids = { admin: 1, manager: 2, user: 3, otherUser: 4 } as const;

export const PASSWORD_HASH = '$argon2id$never-expose-me';

export interface Fixture {
  app: INestApplication<App>;
  users: InMemoryRepository;
  tasks: InMemoryRepository;
  /** Inserts a task and returns it. */
  seedTask(overrides?: Record<string, unknown>): Record<string, any>;
  /** A valid access token for the user with this id (claims are minimal). */
  tokenFor(id: number, extraClaims?: Record<string, unknown>): string;
  /** `Authorization` header tuple for supertest's `.set(...)`. */
  as(id: number): [string, string];
  http(): ReturnType<typeof request>;
}

/**
 * Builds the REAL RbacModule (controllers, services, guards) and the REAL
 * Task 4 JWT strategy on top of in-memory repositories. Nothing about
 * authentication or authorization is mocked: if a request is allowed or
 * denied, your code decided it.
 *
 * Seeded accounts: admin (1), manager (2), user (3), otherUser (4) - all with a
 * stored password hash, so a response that leaks it is caught.
 */
export async function createFixture(): Promise<Fixture> {
  const users = new InMemoryRepository(['email']);
  const tasks = new InMemoryRepository();
  const accounts: [number, string, Role][] = [
    [ids.admin, 'admin@example.com', Role.ADMIN],
    [ids.manager, 'manager@example.com', Role.MANAGER],
    [ids.user, 'user@example.com', Role.USER],
    [ids.otherUser, 'other@example.com', Role.USER],
  ];
  for (const [id, email, role] of accounts)
    users.seed({ id, email, role, passwordHash: PASSWORD_HASH });

  const moduleRef = await Test.createTestingModule({
    imports: [PassportModule, RbacModule],
    providers: [
      JwtStrategy,
      UsersService,
      {
        provide: JWT_CONFIG,
        useValue: {
          secret: TEST_JWT_SECRET,
          expiresIn: '15m',
          issuer: TEST_JWT_ISSUER,
          audience: TEST_JWT_AUDIENCE,
        },
      },
      { provide: getRepositoryToken(User), useValue: users },
      { provide: getRepositoryToken(RbacTask), useValue: tasks },
    ],
  })
    .overrideProvider(getRepositoryToken(User))
    .useValue(users)
    .overrideProvider(getRepositoryToken(RbacTask))
    .useValue(tasks)
    .compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>({
    logger: false,
  });
  configureApp(app);
  await app.init();

  const tokenFor = (id: number, extraClaims: Record<string, unknown> = {}) =>
    signTestJwt({ sub: id, ...extraClaims });

  return {
    app,
    users,
    tasks,
    seedTask: (overrides = {}) =>
      tasks.seed({
        title: 'Seeded task',
        description: null,
        status: TaskStatus.TODO,
        assigneeId: null,
        createdById: ids.manager,
        ...overrides,
      }),
    tokenFor,
    as: (id) => ['Authorization', `Bearer ${tokenFor(id)}`],
    http: () => request(app.getHttpServer()),
  };
}
