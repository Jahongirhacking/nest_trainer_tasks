# Evaluation – Assignment 3 (100 points)

| Area | Points | What is judged |
|---|---|---|
| Entity design and relational mapping | 15 | correct columns/types/lengths, nullable/default, One-to-Many ↔ Many-to-One, explicit FK column, sensible `onDelete`, no circular-import problems, no redundant data |
| TypeORM repository integration and dependency injection | 15 | `forRootAsync` use, `forFeature` per module, `@InjectRepository`, correct imports/exports, no manual repository creation, no array storage, no controller→repo access |
| Correct CRUD behaviour | 15 | all endpoints/status codes/response shapes, 404 vs 400 handling, partial updates, `updatedAt` behaviour, project-scoped task listing |
| PostgreSQL constraints and referential integrity | 15 | unique name, FK, NOT NULL, length limits, no cascade, delete-with-tasks rejected, behaviour under the concurrent-delete scenario |
| Migrations and database configuration | 10 | correct reviewed migration with working `down()`, `synchronize` off, env-based config, no secrets committed, clear startup errors |
| Validation and HTTP error handling | 10 | DTO rules, unknown/forbidden properties, empty PATCH, only *known* DB errors mapped to 409/404, unexpected errors stay 500 and are logged, no SQL/credentials leaked |
| Unit, integration and E2E tests | 15 | all provided suites green, tests untouched, any extra tests meaningful and isolated |
| Code quality and maintainability | 5 | naming, small focused methods, consistency with the codebase, comments only where they add value |

Passing tests alone does not guarantee 100: design decisions (concurrency strategy, relation ownership, module boundaries, `onDelete` choice) are reviewed and you should be able to defend each trade-off.

**Grade bands:** 90–100 excellent · 75–89 good · 60–74 pass · < 60 redo.
