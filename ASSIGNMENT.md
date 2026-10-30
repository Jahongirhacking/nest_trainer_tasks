# Assignment 5 – Role-Based Access Control (RBAC) with NestJS Guards, Reflector and Custom Decorators

**Difficulty:** Advanced
**Builds on:** Assignment 4 (Passport + JWT, see [docs/task_4/](docs/task_4/ASSIGNMENT.md)). You reuse its login, `JwtStrategy`, `JwtAuthGuard`, `User` entity and `UsersService`. Do not rebuild them.
**Stack:** NestJS 12, TypeScript, PostgreSQL 16, TypeORM 1.x, `@nestjs/passport` + `passport-jwt`, class-validator, Vitest + Supertest, pnpm, Node 24 (`.nvmrc`)

> Rule of the game: the module structure, enums, entity, DTOs, services, controllers, test helpers and tests are given. **The decorators, the guards, the role → permission matrix, the ownership rule, the assignment rule, the decisions about metadata and the wiring are yours.** Everything marked `TODO` is intentionally unfinished and fails closed (a guard that denies, a decorator that records nothing).
>
> The code lives in [src/rbac/](src/rbac/) and is part of the application (`AppModule` imports `RbacModule`). The Task 5 unit/HTTP tests need **no database**; they run on in-memory repositories.
>
> **Change to earlier tasks:** Task 3's flat routes `GET /tasks`, `GET|PATCH|DELETE /tasks/:id` were renamed `/project-tasks` and `/project-tasks/:id` (same handlers), so `/tasks` belongs to this assignment. The Task 3 e2e tests were updated accordingly; `/projects/:projectId/tasks` is unchanged.

## 1. Learning objectives

- Authentication vs. authorization: 401 vs. 403, and which guard answers which
- Roles vs. permissions, and why a role → permission matrix is useful
- Custom decorators that only record **metadata**, and `@CurrentUser()` as a typed parameter decorator
- `Reflector` and `ExecutionContext`: reading handler-level and controller-level metadata
- Guards: ordering, fail-closed behaviour, never trusting the client
- Resource-level authorization (ownership) vs. role-level authorization
- Keeping authorization out of controllers

## 2. Scope

**In scope:** `Role` / `Permission` model, `@Roles()`, `@Permissions()`, `@CurrentUser()`, `RolesGuard`, `PermissionsGuard`, `TaskOwnerGuard`, the matrix, metadata rules, wiring, a `role` column on `users`, a migration.

**Out of scope (do not build them):** refresh tokens, token revocation, a permissions admin UI, multi-tenancy. The Task 1–3 routes (`/projects`, `/projects/:projectId/tasks`, `/project-tasks…`) are not changed.

## 3. Business rules

| | ADMIN | MANAGER | USER |
|---|---|---|---|
| Users | list, create, update, delete | list only | – (own profile via `GET /auth/me`) |
| Tasks | list all, create, update, delete, assign | list all, create, update, assign **to USER accounts only** | see tasks assigned to them, change the **status** of their own tasks |
| Roles / permissions | manage | **cannot** | **cannot** |

"Own task" means the task's `assigneeId` equals the caller's id.

### Role and permission matrix

| Permission | ADMIN | MANAGER | USER |
|---|:-:|:-:|:-:|
| `users.read` | ✅ | ✅ | ❌ |
| `users.create` | ✅ | ❌ | ❌ |
| `users.update` | ✅ | ❌ | ❌ |
| `users.delete` | ✅ | ❌ | ❌ |
| `tasks.read` | ✅ | ✅ | ❌ |
| `tasks.create` | ✅ | ✅ | ❌ |
| `tasks.update` | ✅ | ✅ | ❌ |
| `tasks.delete` | ✅ | ❌ | ❌ |
| `tasks.assign` | ✅ | ✅ | ❌ |
| `roles.manage` | ✅ | ❌ | ❌ |

USER's abilities (own tasks) are **ownership** rules, not permissions.

## 4. Architecture

```text
Request
  │
  ▼  JwtAuthGuard ───────────── no/invalid token, or deleted user ─► 401
  │  (Task 4: request.user = the CURRENT user from PostgreSQL, with its role)
  ▼
  RolesGuard / PermissionsGuard ─ reads @Roles / @Permissions with Reflector ─► 403
  │
  ▼  TaskOwnerGuard (only PATCH /tasks/:id/status) ─ owner or ADMIN ─► 403 / 404
  │
  ▼  ValidationPipe ─► 400          (authorization runs BEFORE validation)
  ▼  Controller ─► Service ─► Repository
```

```text
src/rbac/
  rbac.module.ts  rbac.constants.ts  rbac.types.ts  role-permissions.ts   ← matrix TODO
  enums/          role.enum.ts  permission.enum.ts  task-status.enum.ts
  decorators/     roles.decorator.ts  permissions.decorator.ts  current-user.decorator.ts   ← TODO
  guards/         roles.guard.ts  permissions.guard.ts  task-owner.guard.ts                  ← TODO
  users/          rbac-users.controller.ts  rbac-users.service.ts  dto/
  tasks/          rbac-tasks.controller.ts  rbac-tasks.service.ts  dto/  entities/rbac-task.entity.ts
  rbac-endpoints.spec.ts  task-ownership.spec.ts  (+ role-permissions / decorators / guards specs)
test/helpers/     rbac-app.ts  rbac-http.ts  rbac-execution-context.ts  in-memory-repository.ts
```

- Controllers contain **no** `if (user.role === …)`. Authorization lives in decorators + guards (and, for the assignment rule, where you decide it belongs).
- Authentication is **already** applied (`@UseGuards(JwtAuthGuard)` on both controllers). Authorization is yours.
- The role is read from the **database** by the Task 4 `JwtStrategy`; it is never read from the token, body or query string.
- `RbacModule` is imported by `AppModule`. The Passport "jwt" strategy comes from `AuthModule`. Entities are picked up automatically (`autoLoadEntities`), so `migration:generate` sees `RbacTask` after `pnpm build`.

## 5. Endpoints and required access

| Method | Endpoint | Required access | Success |
|---|---|---|---|
| GET | `/users` | ADMIN, MANAGER | 200 list (no credential fields) |
| POST | `/users` | ADMIN | 201 |
| PATCH | `/users/:id` | ADMIN | 200 |
| DELETE | `/users/:id` | ADMIN | 204 |
| GET | `/tasks` | ADMIN, MANAGER | 200 |
| POST | `/tasks` | ADMIN, MANAGER | 201 |
| GET | `/tasks/my` | any authenticated user | 200 (tasks assigned to the caller) |
| PATCH | `/tasks/:id` | ADMIN, MANAGER | 200 |
| PATCH | `/tasks/:id/status` | the task's owner (assignee) **or** ADMIN | 200 |
| DELETE | `/tasks/:id` | ADMIN | 204 |
| PATCH | `/tasks/:id/assign` | ADMIN, MANAGER (see "Assignment rules") | 200 |

Error semantics (same envelope as Task 2–4):

| Situation | Status |
|---|---|
| no token, malformed/expired/forged token, account deleted | **401** |
| authenticated, but the role/permission/ownership does not allow it | **403** |
| unknown id (task/user), when the caller is allowed to ask | **404** |
| invalid body or id format | **400** |

## 6. Rules you must implement and defend

### Metadata rules

| | Rule |
|---|---|
| `@Roles(a, b)` | caller needs **any** of the listed roles |
| `@Permissions(a, b)` | caller needs **all** of the listed permissions |
| Roles: handler vs controller | the **handler-level** list **replaces** the controller-level list |
| Permissions: handler vs controller | the two lists are **combined**; the caller needs everything in both |
| No metadata at all | the guard lets an authenticated caller through (authentication is still required) |
| `@Roles()` with no arguments | nobody passes (an empty requirement can never be met) |
| Caller has no principal, or `role` is not a real `Role` (`'superadmin'`, `'ADMIN'`, `[…]`, missing) | denied |
| A guard says no | it returns `false` (Nest answers **403**) |

ADMIN has no hidden bypass in `RolesGuard`: a route lists the roles that may use it. ADMIN's power over permissions comes from the matrix.

### Ownership rules (`PATCH /tasks/:id/status`)

- The owner is the user in `assigneeId`. A task assigned to nobody belongs to nobody (only ADMIN can change its status).
- ADMIN may change any task's status. MANAGER has no special right here: a manager changes the status only of a task assigned to themselves.
- A missing task is **404 for every caller**. (Think about what a different answer for USER would reveal.)
- Ownership is checked **before** the body is validated: a non-owner sending a bad body gets 403, an owner sending a bad body gets 400.
- A malformed id (`abc`, `1.5`, `0`, `1 OR 1=1`) must never produce a 5xx or a success.

### Assignment rules (`PATCH /tasks/:id/assign`)

- ADMIN may assign a task to any existing user.
- MANAGER may assign only to accounts **whose current role is USER** (403 otherwise; the check uses the role stored now, not an old one).
- An unknown task or an unknown assignee is 404.

## 7. Implementation checklist (recommended order)

1. **Data:** add a `role` column to `User` (`Role`, `NOT NULL`, default `user`), remove the `UserWithRole` alias in `rbac.types.ts`, generate and **review** a migration; add a migration for `rbac_tasks`. Make sure a user created through Task 4 registration still works.
2. **Matrix:** fill `ROLE_PERMISSIONS`.
3. **Decorators:** `@Roles()`, `@Permissions()`, `@CurrentUser()`.
4. **`RolesGuard`**, then **`PermissionsGuard`** (unit tests first).
5. **Apply** them to the two controllers; keep authentication first.
6. **`TaskOwnerGuard`** for the status route.
7. **Assignment rule** in `RbacTasksService.assign` (or elsewhere, defend it).
8. **Review** with the "401 or 403?" question for every row of the endpoint table.

## 8. Tests

```bash
nvm use                       # Node 24
pnpm test:rbac                # the Task 5 suite (no database needed)
pnpm test                     # all unit suites (Task 1–4 green; Task 5 red until you finish)
pnpm test:e2e                 # needs `pnpm db:test:up`; Task 3/4 e2e must stay green
```

| Test file | What it checks |
|---|---|
| `src/rbac/role-permissions.spec.ts` | the matrix |
| `src/rbac/decorators/decorators.spec.ts` | metadata keys, class vs method, empty `@Roles()`, `@CurrentUser()` |
| `src/rbac/guards/roles.guard.spec.ts` | any-of, controller vs route override, missing metadata, bad principals |
| `src/rbac/guards/permissions.guard.spec.ts` | all-of, merge of controller + route, missing metadata, bad principals |
| `src/rbac/rbac-endpoints.spec.ts` | every endpoint × role (401/403/2xx), no escalation through token claims, role changes take effect immediately |
| `src/rbac/task-ownership.spec.ts` | owner/ADMIN rules, 404 vs 403, validation order, assignment rules |

They run the **real** `JwtStrategy`, guards and controllers on in-memory repositories; only storage is faked. Some tests (for example "no token → 401") already pass on the starter because Task 4 authentication exists: green is not the goal, understanding why each test is red is. Do not edit the provided tests.

## 9. Definition of Done

- `pnpm test` and `pnpm test:e2e` are green; `pnpm build` and `npx tsc --noEmit` show no new errors.
- Every row of the endpoint table holds, and you can say for each failure whether it is 401, 403 or 404 and why.
- No role is read from the token, body, query string or headers.
- Controllers contain no role checks; guards contain no database access except `TaskOwnerGuard`'s task lookup.
- The migration was read, and the `role` column does not break Task 4 registration/login.
- You can explain the metadata rules (why roles *replace* and permissions *merge*) and the "no metadata" policy, including its risk.

## 10. Advanced challenges (optional)

1. Authorize with **permissions** instead of roles on every route.
2. Support **multiple roles per user** (many-to-many); decide what "any of" and the matrix mean now.
3. Model **role → permission** in the database with TypeORM relations.
4. Load **dynamic permissions** from the database (and think about caching and invalidation).
5. A reusable **`@Public()`** decorator.
6. A **global** authorization guard (`APP_GUARD`); decide the default for routes without metadata (secure by default).
7. Resolve **metadata inheritance and override** for a custom base controller.
8. Write your own **unit tests for guards** and **integration tests** against PostgreSQL.
9. Stop an ADMIN from demoting or deleting the **last remaining admin** (or themselves).
10. Replace the in-memory test fixture with PostgreSQL-backed e2e tests for the Task 5 endpoints (`test/*.e2e-spec.ts`).

## 11. Security failures that cap the score at 59

- a role, permission or user id taken from the token claims, body, query string or headers
- a route that should be protected but answers 2xx to an anonymous or under-privileged caller
- authorization written as `if (user.role …)` inside controllers or services instead of metadata + guards
- a guard that fails **open** (returns `true` on an error, a missing user or an unknown role)
- a response that contains `passwordHash`
- a MANAGER able to create/promote an ADMIN, or a USER able to promote themselves
- editing the provided tests to make them pass
