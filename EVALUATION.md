# Evaluation – Assignment 5 (100 points)

| Area | Points | What is judged |
|---|---|---|
| Role and permission model | 10 | enums used consistently, matrix correct and the single source of truth, `role` column + reviewed migration, Task 4 registration/login still work |
| Custom decorators | 10 | `@Roles()` / `@Permissions()` record metadata only (class and method, right keys, empty-list behaviour); `@CurrentUser()` reads only the authenticated principal and is typed |
| RolesGuard and Reflector | 15 | correct Reflector helper for "handler replaces controller", any-of semantics, missing metadata, bad/forged principals denied, returns `false` (403), no authentication inside |
| PermissionsGuard | 15 | role → permissions mapping, all-of semantics, handler + controller combined, missing metadata, bad principals denied |
| Resource-level authorization | 15 | `TaskOwnerGuard` (owner or ADMIN, unassigned = nobody), 404 for every caller on a missing task, malformed ids never 5xx, authorization before validation, assignment rule with the *current* assignee role |
| 401 vs 403 and endpoint protection | 10 | every row of the endpoint table holds, anonymous = 401, forbidden = 403, no handler runs on denial, error envelope consistent, no credential fields in responses |
| Architecture and wiring | 10 | no role checks in controllers, guard order (authentication first), DI/module boundaries, no circular imports, `RbacModule` integrated in `AppModule`, no route clash with Task 3 |
| Tests | 10 | `pnpm test` and `pnpm test:e2e` green, provided tests untouched, any extra tests meaningful |
| Code quality and maintainability | 5 | naming, small focused guards, consistency with the codebase, comments only where they add value |

Passing tests alone does not guarantee 100: the review looks at fail-closed behaviour, metadata semantics and the answers to the design questions in `HINTS.md` (level 4).

## Critical security failures

Any of these means the assignment is **not complete**, whatever the test results (the score is capped at 59):

- a role, permission or user id taken from the token claims, body, query string or headers
- a protected route that answers 2xx to an anonymous or under-privileged caller
- authorization implemented as `if (user.role …)` in controllers or services instead of metadata + guards
- a guard that fails open (an error, a missing user or an unknown role lets the request through)
- `passwordHash` (or any credential) in a response
- a MANAGER able to create or promote an ADMIN, or a USER able to promote themselves
- the provided tests edited to make them pass
- Task 3 or Task 4 migrations edited or existing data dropped

**Grade bands:** 90–100 excellent · 75–89 good · 60–74 pass · < 60 redo.
