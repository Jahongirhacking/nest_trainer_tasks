import type { INestApplication } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { configureApp } from '../../src/app.setup.js';
import { JWT_CONFIG } from '../../src/auth/auth.constants.js';
import { JwtStrategy } from '../../src/auth/strategies/jwt.strategy.js';
import { Project } from '../../src/projects/entities/project.entity.js';
import { Task } from '../../src/tasks/entities/task.entity.js';
import { User } from '../../src/users/entities/user.entity.js';
import { UsersService } from '../../src/users/users.service.js';
import {
  signTestJwt,
  TEST_JWT_AUDIENCE,
  TEST_JWT_ISSUER,
  TEST_JWT_SECRET,
} from './jwt.js';
import { Role } from '../../src/rbac/enums/role.enum.js';
import { TaskStatus } from '../../src/tasks/enums/task-status.enum.js';
import { RbacModule } from '../../src/rbac/rbac.module.js';
import { InMemoryRepository } from './in-memory-repository.js';
import type { RequestLogEntry } from '../../src/common/interfaces/request-log.interface.js';
import type { RequestProcessingConfig } from '../../src/common/interfaces/request-processing-config.interface.js';
import { RequestProcessingModule } from '../../src/common/request-processing.module.js';
import {
  REQUEST_LOGGER,
  REQUEST_PROCESSING_CONFIG,
} from '../../src/common/tokens/request-processing.tokens.js';

/** The config every fixture uses unless a test overrides parts of it. */
export const TEST_REQUEST_CONFIG: RequestProcessingConfig = {
  requestLoggingEnabled: true,
  timingLogsEnabled: true,
  maxPageSize: 50,
  requestIdHeader: 'x-request-id',
  environment: 'test',
};

export interface FixtureOptions {
  /** Overrides parts of `TEST_REQUEST_CONFIG` (Task 6). */
  requestConfig?: Partial<RequestProcessingConfig>;
}

/** Ids of the seeded accounts. */
export const ids = { admin: 1, manager: 2, user: 3, otherUser: 4 } as const;

export const PASSWORD_HASH = '$argon2id$never-expose-me';

export interface Fixture {
  app: INestApplication<App>;
  users: InMemoryRepository;
  tasks: InMemoryRepository;
  projects: InMemoryRepository;
  /** Id of the seeded project every seeded task belongs to. */
  projectId: number;
  /** Inserts a task and returns it. */
  seedTask(overrides?: Record<string, unknown>): Record<string, any>;
  /** A valid access token for the user with this id (claims are minimal). */
  tokenFor(id: number, extraClaims?: Record<string, unknown>): string;
  /** `Authorization` header tuple for supertest's `.set(...)`. */
  as(id: number): [string, string];
  http(): ReturnType<typeof request>;
  /** Every entry the request processing system logged (Task 6). */
  logs: RequestLogEntry[];
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
export async function createFixture(
  options: FixtureOptions = {},
): Promise<Fixture> {
  const logs: RequestLogEntry[] = [];
  const users = new InMemoryRepository(['email']);
  const tasks = new InMemoryRepository();
  const projects = new InMemoryRepository(['name']);
  const project = projects.seed({ name: 'Seeded project', description: null });
  const accounts: [number, string, Role][] = [
    [ids.admin, 'admin@example.com', Role.ADMIN],
    [ids.manager, 'manager@example.com', Role.MANAGER],
    [ids.user, 'user@example.com', Role.USER],
    [ids.otherUser, 'other@example.com', Role.USER],
  ];
  for (const [id, email, role] of accounts)
    users.seed({ id, email, role, passwordHash: PASSWORD_HASH });

  const moduleRef = await Test.createTestingModule({
    imports: [PassportModule, RbacModule, RequestProcessingModule],
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
      { provide: getRepositoryToken(Task), useValue: tasks },
      { provide: getRepositoryToken(Project), useValue: projects },
    ],
  })
    .overrideProvider(getRepositoryToken(User))
    .useValue(users)
    .overrideProvider(getRepositoryToken(Task))
    .useValue(tasks)
    .overrideProvider(getRepositoryToken(Project))
    .useValue(projects)
    // Task 6: isolated configuration and an in-memory log sink.
    .overrideProvider(REQUEST_PROCESSING_CONFIG)
    .useValue({ ...TEST_REQUEST_CONFIG, ...options.requestConfig })
    .overrideProvider(REQUEST_LOGGER)
    .useValue({ log: (entry: RequestLogEntry) => logs.push(entry) })
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
    projects,
    projectId: project.id,
    seedTask: (overrides = {}) =>
      tasks.seed({
        title: 'Seeded task',
        description: null,
        projectId: project.id,
        status: TaskStatus.TODO,
        completed: false,
        assigneeId: null,
        createdById: ids.manager,
        ...overrides,
      }),
    tokenFor,
    as: (id) => ['Authorization', `Bearer ${tokenFor(id)}`],
    http: () => request(app.getHttpServer()),
    logs,
  };
}
