# Evaluation Rubric (100 points)

| Category | Points |
| -------- | -----: |
| Module organization and dependency injection | 15 |
| Controller and service responsibility separation | 15 |
| Correct CRUD behavior | 20 |
| DTO validation and invalid input handling | 20 |
| HTTP status codes and exception handling | 10 |
| Unit and E2E test results | 10 |
| Code quality and TypeScript correctness | 10 |
| **Total** | **100** |

> **Passing tests alone does not guarantee a perfect score.** Tests verify observable behavior. Architecture, readability and maintainability are reviewed separately, and points are **never awarded automatically** from test results.

## Criteria

### Module organization and dependency injection (15)
- `TasksModule` registers controller and service; `AppModule` imports it (5)
- Constructor injection, no manual instantiation (5)
- Global `ValidationPipe` configured once and in the right place; no unnecessary modules or abstractions (5)

### Controller and service responsibility separation (15)
- Controller only handles HTTP concerns and delegates (7)
- Service owns storage, id generation and business rules; independently testable (6)
- No storage or business rules leaked into the controller or DTOs (2)

### Correct CRUD behavior (20)
- Create: server-generated id/`createdAt`, `completed=false` (5)
- List, including empty list (3)
- Get one (4)
- Partial update that changes only the supplied properties (5)
- Delete actually removes the task (3)

### DTO validation and invalid input handling (20)
- Title rules incl. trimming and whitespace-only (6)
- Description rules (3)
- `completed` boolean rule (3)
- Unknown / forbidden properties rejected on create and update (4)
- Empty PATCH body and malformed ids rejected (4)

### HTTP status codes and exception handling (10)
- 201 / 200 / 204 used correctly (4)
- 404 via NestJS exceptions thrown from the right layer (3)
- 400 responses use the standard Nest error body (3)

### Unit and E2E test results (10)
- All unit tests pass (4)
- All E2E tests pass (4)
- Tests unmodified, none skipped (2)

Partially passing suites earn proportional credit, reviewed by hand.

### Code quality and TypeScript correctness (10)
- `pnpm build` and `pnpm lint` clean (4)
- No `any`, sensible types, no dead code or leftover scaffolding (3)
- Naming, readability, small focused methods, formatted with Prettier (3)

## How to run the checks

```bash
pnpm build
pnpm lint
pnpm test
pnpm test:e2e
```

## Review checklist (manual, beyond tests)

- Do all `TODO` comments and `throw new Error('Not implemented')` scaffolding disappear?
- Would the controller still be correct if the storage were replaced by a database?
- Does the service return data in a way that prevents accidental mutation of its storage? (a discussion point, not a hard requirement)
- Are the validation rules expressed declaratively in the DTOs rather than with `if` statements?
- Can you justify each design decision?
