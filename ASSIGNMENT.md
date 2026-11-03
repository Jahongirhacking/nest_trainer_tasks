# Assignment 6 – Request Processing System: Middleware, Interceptors, Pipes, Custom Providers and ExecutionContext

**Difficulty:** Advanced
**Builds on:** Assignment 5 (RBAC, see [docs/task_5/](docs/task_5/ASSIGNMENT.md)). You keep its guards, roles, permissions, ownership and assignment rules exactly as they are.
**Stack:** NestJS 12, TypeScript, RxJS 7, class-validator, Vitest + Supertest, pnpm, Node 24 (`.nvmrc`)

> Rule of the game: the interfaces, tokens, test helpers, the sink that prints log lines, the demo routes and **all tests** are given. **The middleware, the interceptor, the two pipes, the configuration provider, the two decorators and the metadata lookup are yours.** Everything marked `TODO` is intentionally unfinished and throws `Not implemented` or returns nothing.
>
> The new code lives in [src/common/](src/common/) (shared infrastructure, like the Task 4 pipe and filter that are already there) and a few routes in [src/rbac/tasks/](src/rbac/tasks/rbac-tasks.controller.ts). The Task 6 unit and HTTP tests need **no database**.

## 1. Learning objectives

- Follow one HTTP request through the NestJS lifecycle and say, for each stage, what it is for and what it can see
- Middleware vs. interceptor, guard vs. pipe, pipe vs. DTO validation: pick the right tool and defend it
- `ExecutionContext`, `CallHandler`, `Observable` and the RxJS operators an interceptor needs (`tap`, `map`, `catchError`, `finalize`)
- Custom providers (`useValue`, `useClass`, `useFactory`, `useExisting`), injection tokens, and keeping configuration out of business code
- Parameter decorators (`createParamDecorator`) and metadata decorators read through `Reflector`
- Writing observability code that never changes the behaviour, the response or the security of the application

## 2. Scope

**In scope:** request id + request logging middleware, timing interceptor, `ParseResourceIdPipe`, `PaginationPipe`, the configuration provider, `@RequestMetadata()`, `@SkipRequestTiming()`, wiring them into the Task 5 application.

**Out of scope (do not build them):** a logging library, log files or rotation, distributed tracing, request-scoped providers (`Scope.REQUEST`), caching, rate limiting, a new database table. Do not touch the Task 1–5 logic. No new dependencies are needed.

## 3. The application you are extending

What exists already (found by reading Task 5, so you do not duplicate it):

| Existing | Where | What it means for Task 6 |
|---|---|---|
| `RbacTasksController` with `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard` | `src/rbac/tasks/` | The controller you extend. Guards run **before** everything you add except middleware. |
| `@CurrentUser()` | `src/rbac/decorators/current-user.decorator.ts` | **Reuse it.** Do not write another one. |
| `ParsePositiveIntPipe`, `@PositiveIntParam()` | `src/common/pipes`, `src/common/decorators` | Task 4/5 already validate `:id` for the other routes. See Module C. |
| `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) + `GlobalExceptionsFilter` | `src/app.setup.ts` | **Global pipe and filter.** They shape every error and they run *before* your parameter pipes. |
| `ResponseInterceptor` | `src/common/interceptors/response.interceptor.ts` | **Not registered anywhere.** It wraps the body in an envelope. Do not register it and do not copy that behaviour: your interceptor must not change the response. |
| `RbacModule` (controllers, services, guards) | `src/rbac/rbac.module.ts` | Imported by `AppModule`. The pipes you add are used by its controller. |
| Task 5 HTTP tests on in-memory repositories | `src/rbac/*.spec.ts`, `test/helpers/rbac-app.ts` | The model for the Task 6 HTTP tests. They must stay green. |

Task ids are **positive integers** (serial primary keys), not UUIDs.

What this task adds (given as scaffolding):

```text
src/common/
  tokens/request-processing.tokens.ts          injection tokens + metadata keys
  interfaces/request-metadata.interface.ts     RequestMetadataInfo, RequestWithMetadata
  interfaces/request-processing-config.interface.ts
  interfaces/request-log.interface.ts          structured log entries + RequestLogger
  providers/request-processing.config.ts       loadRequestProcessingConfig()          TODO
  providers/request-processing.provider.ts     the config provider registration       TODO
  providers/nest-request-logger.ts             the default log sink                   GIVEN
  middleware/request-logging.middleware.ts                                            TODO
  interceptors/request-timing.interceptor.ts                                          TODO
  decorators/request-metadata.decorator.ts                                            TODO
  decorators/skip-request-timing.decorator.ts                                         TODO
  pipes/parse-resource-id.pipe.ts                                                     TODO
  pipes/pagination.pipe.ts                                                            TODO
  request-processing.module.ts                 registration, `configure()`            TODO
src/rbac/tasks/rbac-tasks.controller.ts        new routes (see section 6)
src/rbac/tasks/rbac-tasks.service.ts           findAll(pagination?)                   GIVEN
```

## 4. The request lifecycle

```text
Incoming HTTP Request
        |
        v
Middleware                      (Express level; no ExecutionContext, no route metadata)
        |
        v
Guards                          (JwtAuthGuard -> RolesGuard -> PermissionsGuard -> TaskOwnerGuard)
        |
        v
Interceptors (before)           (code before next.handle())
        |
        v
Pipes                           (global ValidationPipe first, then parameter-level pipes)
        |
        v
Controller handler
        |
        v
Service
        |
        v
Interceptors (after)            (operators on the Observable, in reverse order)
        |
        v
HTTP response
```

**Exception filters** are not a stage on this line: they sit "around" it. An exception thrown while the request travels through guards, interceptors, pipes, the handler or the service ends up in the exception filters (here the global `GlobalExceptionsFilter`), which turn it into the JSON error response. Figure out *exactly* which stages are covered and what that means for an interceptor that wants to measure a request that fails (Module B and the HTTP tests ask for it).

Be able to answer these. The answers are not in this file (see `HINTS.md`, level 1, for where to look):

1. What is the responsibility of middleware?
2. Why do guards execute before pipes?
3. What is the difference between middleware and interceptors?
4. Why can interceptors execute code before and after the handler?
5. What does `ExecutionContext` provide?
6. What is the purpose of `CallHandler`?
7. Why do interceptors use Observables?
8. What is the difference between `tap`, `map` and `finalize`?
9. What is the difference between a pipe and a DTO validator?
10. When should a custom provider be used?
11. What is the difference between `useValue`, `useClass` and `useFactory`?
12. How does `Reflector` retrieve metadata?
13. How do custom decorators access the current request?
14. What happens when an exception is thrown inside an interceptor or a controller?

## 5. Modules

All contracts below are enforced by the tests. They are written in the TODO comments of the scaffold too.

### Module A – Request logging middleware

`RequestLoggingMiddleware` runs for **every** request, including requests that a guard will reject and routes that do not exist.

1. Generate a **new unique request id** for every request, on the server. An id sent by the client (`X-Request-Id`) is **never** reused: it would let a client forge entries in your logs.
2. Build a `RequestMetadataInfo` – exactly `{ requestId, startedAt, clientIp, userAgent }` – and attach it to the request under `REQUEST_METADATA_PROPERTY`.
3. Send the id in the response header named by `config.requestIdHeader`.
4. Log (through the injected `RequestLogger`, never `console`):
   - `request.started` immediately: `requestId`, `method`, `url`, `timestamp` (ISO-8601), `clientIp`, `userAgent`
   - `request.completed` when the response has been sent: `requestId`, `method`, `url`, `statusCode`, `durationMs`
5. `config.requestLoggingEnabled === false` → no entries at all, but the id, the metadata and the header still work.
6. Call `next()` exactly once. No business logic, no database access, no knowledge of any controller.

### Module B – Request timing interceptor

`RequestTimingInterceptor` logs **one** `request.timing` entry per handled request: `requestId`, `method`, `url`, `statusCode`, `durationMs`, `outcome` (`"success"` | `"error"`).

- Success: `statusCode` is the response's. Error: `statusCode` is the `HttpException`'s status, `500` for any other error.
- The caller receives the handler's stream untouched: the same object on success, the **same error instance** on failure. Nothing is added, wrapped or swallowed.
- Exactly one entry on every path; asynchronous handlers work; the handler is subscribed to once.
- No entry when `config.timingLogsEnabled === false` or when the route is skipped (Module F). The handler still runs.
- `requestId` comes from the request metadata set by the middleware; `UNKNOWN_REQUEST_ID` when it is missing.
- You choose the RxJS operators. In your notes explain what each one you chose does on the success and the error path, and why `map` would be the wrong tool.

Two requests measure time differently by design: the middleware's `request.completed` covers guards, pipes, filters and the write of the response; the interceptor's `request.timing` covers only the handler path. A request that a guard rejects has the first and not the second. The HTTP tests check this.

### Module C – Custom pipes

**`ParseResourceIdPipe`** validates a resource id parameter and returns it as a **number**: only positive integers written as plain decimal digits are accepted (see the table in the pipe's comment). Everything else, including non-string input, is a `BadRequestException` that names the parameter. It is used by `GET /tasks/:id`.

`ParsePositiveIntPipe` (Task 4) does something very close. Decide how the two relate and defend the choice: reuse, extend, compose or replace. Copy-pasting its logic is not an answer.

**`PaginationPipe`** turns the query `?page=2&limit=10` into `{ page: 2, limit: 10 }`:

- defaults `page = 1`, `limit = 10` (never above the configured maximum)
- plain decimal digit strings only; `0`, negatives, decimals, exponents, empty strings, words, repeated parameters (`?page=1&page=2`) and values beyond `Number.MAX_SAFE_INTEGER` are `400`
- a `limit` above `config.maxPageSize` is **rejected** (`400`), not silently reduced; `limit === maxPageSize` is fine
- the maximum comes from the injected configuration, never from a constant
- the result has exactly `page` and `limit`

Be ready to explain when a custom pipe is the right tool and when `ValidationPipe` with a DTO is. (Hint: look at what already validates `POST /tasks`.)

### Module D – Custom provider and dependency injection

`RequestProcessingConfig` is built from the environment, validated once at startup, and injected through `REQUEST_PROCESSING_CONFIG`:

| Variable | Field | Default | Rules |
|---|---|---|---|
| `REQUEST_LOGGING_ENABLED` | `requestLoggingEnabled` | `true` | `true`, `false`, `1`, `0`, any letter case |
| `REQUEST_TIMING_ENABLED` | `timingLogsEnabled` | `true` | same |
| `MAX_PAGE_SIZE` | `maxPageSize` | `100` | positive integer in plain decimal digits |
| `REQUEST_ID_HEADER` | `requestIdHeader` | `x-request-id` | letters, digits, `-`; stored in lower case |
| `NODE_ENV` | `environment` | `development` | any value |

- `loadRequestProcessingConfig(env)` is a pure function of the `env` object it gets. It never reads `process.env` itself and never modifies its argument.
- A variable that is **unset** gets its default. A variable that is **set but invalid** (including the empty string) makes it throw an `Error` whose message names the variable. The application must not start with a broken configuration.
- The returned object is frozen.
- `requestProcessingConfigProvider` must use **at least one** of `useValue`, `useClass`, `useFactory`, `useExisting`, call `loadRequestProcessingConfig(process.env)` **when the module is created** (not when the file is imported), and be injectable into the middleware, the interceptor and the pipe. Explain in your notes why that pattern fits.
- Middleware, interceptor and pipe contain no hard-coded configuration and no circular dependency.

### Module E – `ExecutionContext` and `@RequestMetadata()`

`@RequestMetadata()` returns the metadata the middleware recorded; `@RequestMetadata('requestId')` returns one field. It reads only that, through `ExecutionContext`. It returns `undefined` (no exception) when the middleware did not run. It exposes nothing else: no headers, no user, no body. For the authenticated user use the existing `@CurrentUser()`.

### Module F – Metadata-driven behaviour: `@SkipRequestTiming()`

- `@SkipRequestTiming()` works on a method and on a controller; it only records metadata under `SKIP_REQUEST_TIMING_KEY`, with the boolean it is given (default `true`).
- `@SkipRequestTiming(false)` on a method turns timing back **on** in a controller that skips it.
- Precedence: method over controller; no metadata at all means the route **is** timed.
- The interceptor reads the metadata with `Reflector`.

## 6. API

Authentication and authorization are the Task 5 ones. The new routes are in `RbacTasksController` and are declared **before** the `:id` routes, so `:id` never captures them.

| Method | Endpoint | Access | Demonstrates |
|---|---|---|---|
| GET | `/tasks?page=&limit=` | ADMIN, MANAGER | `PaginationPipe`. The body is still a plain array. **You wire the pipe** (TODO in the controller). |
| GET | `/tasks/:id` | ADMIN, MANAGER (`tasks.read`) | `ParseResourceIdPipe` (given wiring) |
| GET | `/tasks/request-info` | any authenticated user | `@RequestMetadata()` → returns the four metadata fields |
| GET | `/tasks/processing-info` | any authenticated user | request id + `@CurrentUser()` + an async handler (waits ~50 ms): `{ requestId, userId }` |
| GET | `/tasks/skip-timing` | any authenticated user | `@SkipRequestTiming()` (given wiring) |

Errors keep the existing envelope `{ statusCode, error, message, errors? }` (the global filter). Authorization still wins over validation: a USER who sends a bad id gets `403`, an anonymous caller `401`.

## 7. Sensitive data

No log entry may contain: an `Authorization` header or any token, cookies, passwords, request bodies, or the **values** of sensitive query parameters (a request like `GET /tasks/my?access_token=...&password=...` must not leak them through `url`). Decide what counts as sensitive and implement it once, in one place. The entries are typed so that headers and bodies cannot even be put in them – keep it that way.

## 8. Implementation checklist (recommended order)

1. Read the tests of Module D. Implement `loadRequestProcessingConfig()`, then register the provider. `pnpm test:request` → provider specs green.
2. Pipes: `ParseResourceIdPipe`, then `PaginationPipe`.
3. `RequestMetadata` decorator and `SkipRequestTiming` decorator (metadata only).
4. `RequestLoggingMiddleware`. Register it in `RequestProcessingModule.configure()` for all routes.
5. `RequestTimingInterceptor`. Register it (global or per controller – decide and defend).
6. Wire the rest: `PaginationPipe` on `GET /tasks`, import `RequestProcessingModule` in `RbacModule` (the pipe needs the config token) and in `AppModule`.
7. Run everything (`pnpm test`), then the database e2e (`pnpm test:e2e`, see "Known issues").
8. Write your notes (section 11).

## 9. Tests

```bash
pnpm test:request     # only the Task 6 specs (src/common)
pnpm test             # everything, no database needed
pnpm test:e2e         # builds, then runs the database suites (see "Known issues")
```

| File | What it checks |
|---|---|
| `src/common/providers/request-processing.provider.spec.ts` | the config function and the provider (defaults, invalid values, DI, overrides) |
| `src/common/middleware/request-logging.middleware.spec.ts` | the class alone, and the registered middleware over HTTP (ids, header, logs, sensitive data, disabled logging) |
| `src/common/interceptors/request-timing.interceptor.spec.ts` | success, failure, exactly-once, response untouched, config flag, `@SkipRequestTiming()` precedence – with a **faked clock** |
| `src/common/pipes/*.spec.ts` | both pipes, including the configured maximum |
| `src/common/decorators/*.spec.ts` | the parameter decorator and the metadata decorator |
| `src/common/request-processing.http.spec.ts` | the whole lifecycle over HTTP: metadata, timing, guard-before-pipe order, pagination, Task 5 RBAC intact, no secrets in logs |
| `test/request-processing.e2e-spec.ts` | a smoke test against the real `AppModule` and PostgreSQL |

Rules:

- **Do not edit the provided tests** to make them pass. If you believe a test is wrong, explain why in your notes; do not change it.
- Test helpers changed for Task 6 (backward compatible): `test/helpers/rbac-app.ts` (`createFixture({ requestConfig })`, `logs`, imports `RequestProcessingModule`), `test/helpers/in-memory-repository.ts` (`skip`/`take`). New helpers: `http-execution-context.ts`, `param-decorator.ts`.
- You may **add** tests (for example for your URL sanitizing). Tests must not depend on exact milliseconds or on the text of a log line; use the fake clock.
- The scaffold is deliberately red: expect failures until you implement the TODOs.

## 10. Definition of Done

- [ ] `pnpm test` is green, including every Task 5 test, with the provided tests untouched
- [ ] `pnpm build` and `pnpm lint` are clean
- [ ] `RequestProcessingModule` is imported by `AppModule`; the application starts with no `.env` entries for Task 6 (defaults) and refuses to start with `MAX_PAGE_SIZE=abc`
- [ ] A request to any route, even a `401` or a `404`, has the request id header
- [ ] No secret in any log entry (try it with a real login request)
- [ ] The middleware and the interceptor contain no `console`, no database access, no `if (user.role …)`, and no hard-coded configuration
- [ ] `ResponseInterceptor` is still unregistered and the response bodies are unchanged
- [ ] Your notes answer the 14 lifecycle questions in your own words and justify the design decisions below

## 11. Notes you must write

Create `NOTES.md` (any length, plain language) with:

1. The 14 questions of section 4.
2. Which provider pattern you used and why; why a token and not a class.
3. Global or controller-level interceptor registration, and what changes.
4. The relation between `ParseResourceIdPipe` and `ParsePositiveIntPipe`.
5. Which RxJS operators your interceptor uses, and what happens to each on success, error and cancellation.
6. What you decided is "sensitive" in a URL, and where.
7. One thing in this assignment you found surprising.

## 12. Advanced challenges (optional)

- Make the request id available to the **services** without passing it through every call (`AsyncLocalStorage`) and explain why `Scope.REQUEST` is a poor fit.
- Use `useExisting` to expose the config under a second token, and explain when an alias is useful.
- Add a `Server-Timing` response header from the interceptor – and explain why that violates "do not touch the response" unless you take care.
- Add `Link`/`X-Total-Count` pagination headers without changing the array body.
- Handle client disconnects: what does the interceptor see when the client aborts?

## 13. Failures that cap the score at 59

- A secret (token, cookie, password, sensitive query value) in a log entry
- A request id taken from the client
- A change that weakens Task 5 authorization (a guard removed or reordered, a route open to anonymous callers)
- The interceptor changing the response body, status or error
- Business logic or database access in the middleware or the interceptor
- The provided tests edited to make them pass, or assertions weakened

## 14. Known issues of the repository (not part of your task)

- `pnpm test:e2e` currently fails to start in every database suite with `Data type "undefined" in "User.role" is not supported by "postgres" database` – the `role` column of the Task 5 `User` entity has no explicit `type`, and the test runner does not emit the metadata TypeORM would infer it from. This predates Task 6. Fixing it is allowed (and small: give the column an explicit `type`/`enum`); do it in a separate commit and say so in your notes. Until it is fixed, `test/request-processing.e2e-spec.ts` cannot run; the HTTP spec covers the same ground without a database.
- `tsc -p tsconfig.json` reports a few type errors in older spec files (`auth.service.spec.ts`, `projects.controller.spec.ts`, `tasks.controller.spec.ts`). `pnpm build` (which excludes specs) is clean.
