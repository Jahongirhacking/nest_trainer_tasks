,k# Assignment 2 – Production-Quality Validation and Error Handling

**Difficulty:** Medium+  
**Builds on:** Assignment 1 (Task Management API, see [docs/task_1/](../task_1/ASSIGNMENT.md))  
**Stack:** NestJS 12, TypeScript, class-validator, class-transformer, Vitest + Supertest, pnpm

## 1. Learning objectives

- `ValidationPipe` and how it uses `class-validator` and `class-transformer`
- DTO design: **create vs. update** DTOs and how to share rules between them
- `whitelist` / `forbidNonWhitelisted` and protecting server-controlled fields
- Route parameter parsing and validation (pipes)
- Validation exceptions and correct HTTP status codes
- A **consistent API error format** (and deciding whether an exception filter is justified)
- Unit and E2E testing of all of the above

No authentication, database, Redis or other infrastructure is added. Tasks stay in memory.

## 2. Prerequisite: Task 1 must work

Task 2 is tested on top of the Task 1 CRUD API. Run the gate first:

```bash
pnpm test:e2e:task1-gate
```

If it fails, finish Task 1 first (module wiring, controller routes and parameter decorators, DI). Failures in the `[Task 2]` suites are not meaningful until the gate is green. Test names tell you where a failure belongs:

| Prefix in test name     | Meaning                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `[Task 1 prerequisite]` | the Task 1 foundation (app boots, five routes work on valid input)                                           |
| `[Task 2]`              | the new validation / error-handling requirements                                                             |
| _(no prefix)_           | the original Task 1 suites (`test/tasks.e2e-spec.ts`, `src/tasks/tasks.*.spec.ts`), kept as regression tests |

## 3. Functional requirements

Endpoints and domain model are unchanged from Task 1 (`id`, `title`, `description?`, `completed`, `createdAt`).

### A. `POST /tasks`

| Property                       | Rule                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `title`                        | required; string; **3–100 characters after trimming**; whitespace-only is invalid; `null`, missing or non-string is invalid |
| `description`                  | optional; if supplied must be a string of at most 500 characters; an explicit `null` is **rejected**                        |
| `completed`, `id`, `createdAt` | **must not be accepted** from the client. The server sets `completed = false`                                               |
| any other property             | validation error; never silently accepted or stored                                                                         |

`201 Created` on success, `400 Bad Request` on validation failure. A rejected request stores nothing.

### B. `PATCH /tasks/:id`

Allowed properties: `title`, `description`, `completed`; each is optional on its own.

- `title` and `description` follow the same rules as creation.
- `completed`, if supplied, must be a boolean (`"true"`, `1`, `0`, `null` are invalid).
- `null` is rejected for all three properties.
- `id`, `createdAt` and unknown properties are rejected.
- An **empty object** `{}` is rejected.
- An update with only `completed`, only `title`, or only `description` is valid.

`200 OK` with the updated task, `400` for an invalid body or id, `404` if the task does not exist. Properties that were not sent stay unchanged. A rejected request changes nothing.

> Order of checks: a malformed id or an invalid body is a `400` **even if** the task does not exist. `404` is only for a valid request that targets a missing task.

### C. Route parameters (`/tasks/:id`)

- `:id` must be a **positive integer**.
- Reject `0`, negative values, decimals and non-numeric/malformed values (`abc`, `1.5`, `-1`, `1abc`, …) with `400`.
- A valid positive integer that matches no task is `404`. Never conflate the two.
- Applies to `GET`, `PATCH` and `DELETE`.

### D. Error response schema

Every expected client error (validation failures, malformed ids, missing tasks) uses this JSON shape:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "messages": ["title must be longer than or equal to 3 characters"]
    },
    { "field": "priority", "messages": ["property priority should not exist"] }
  ]
}
```

| Field        | Type            | Rules                                                                                                                                                                                                                                                                                                                                        |
| ------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `statusCode` | number          | equals the HTTP status of the response                                                                                                                                                                                                                                                                                                       |
| `error`      | string          | the standard HTTP reason phrase for that status (`"Bad Request"`, `"Not Found"`, `"Conflict"`, …): a stable category                                                                                                                                                                                                                         |
| `message`    | string          | non-empty, human-readable summary. **A string, not an array.** Tests never compare its text                                                                                                                                                                                                                                                  |
| `errors`     | array, optional | present when the failure is attributable to specific request-body fields. Each entry is exactly `{ "field": string, "messages": string[] }` with at least one message. For an unknown property, `field` is that property's name. Omit it (or leave it out entirely) for errors that name no field: malformed ids, `404`, an empty PATCH body |

Rules:

- Never include stack traces, file paths or internal details.
- Never return a `2xx` response that embeds an error object.
- Successful responses keep their Task 1 format (bare task object / array / `204` empty).

### E. Exception handling

- Invalid input ⇒ `400`; missing task ⇒ `404`; both thrown as Nest `HttpException`s from the appropriate layer.
- Unexpected (non-HTTP) errors ⇒ `500`, never a success response, never leaking their message or stack.
- Any `HttpException` keeps its original status code (e.g. a `409` stays `409`).
- Do not unnecessarily replace Nest's standard exception behavior.

**Is a custom exception filter required?** That is part of your design decision and a review item. Nest's default body is already `{ statusCode, message, error }`, so the only gap against the schema above is the field-level `errors` list and a string `message`. A scaffold exists at `src/common/filters/http-exception.filter.ts`; you may implement it, close the gap another way, or both, but you must be able to defend the choice. The tests only check observable behavior and work with any of these designs. Do not build a large global exception framework.

## 4. Architecture requirements

- **DTOs** hold the validation rules. Do not copy-paste every rule between `CreateTaskDto` and `UpdateTaskDto` without thinking about maintainability. Choose and justify a reuse strategy.
- **Global `ValidationPipe`** configured in `src/app.setup.ts` (called by `main.ts` and every E2E test) so unexpected properties are rejected. A pipe already exists from Task 1: review it, do not assume it is sufficient.
- **Controller**: HTTP concerns only; uses Nest's parameter parsing; no hand-written validation inside route methods; no per-route error formatting.
- **Service**: business logic; throws Nest exceptions for expected failures; knows nothing about requests/responses.
- **Filter** (if any): HTTP error formatting only; no business validation; does not swallow unexpected errors.
- Keep the method names and signatures listed in [docs/task_1/ASSIGNMENT.md](../task_1/ASSIGNMENT.md), section 6: the tests call them.

## 5. Where to work

| File                                          | Task 2 work                                                   |
| --------------------------------------------- | ------------------------------------------------------------- |
| `src/tasks/dto/create-task.dto.ts`            | complete the validation rules                                 |
| `src/tasks/dto/update-task.dto.ts`            | complete the rules, reject `null` and `{}`                    |
| `src/tasks/tasks.controller.ts`               | route-param parsing/validation (and Task 1 leftovers)         |
| `src/app.setup.ts`                            | review pipe configuration, register the filter if you use one |
| `src/common/filters/http-exception.filter.ts` | optional filter scaffold                                      |
| `src/tasks/tasks.service.ts`                  | exceptions for expected failures                              |

## 6. Tests

| Command                    | What it runs                                                          |
| -------------------------- | --------------------------------------------------------------------- |
| `pnpm test:e2e:task1-gate` | `[Task 1 prerequisite]` smoke tests                                   |
| `pnpm test:task2`          | DTO unit tests (`create-task.dto.spec.ts`, `update-task.dto.spec.ts`) |
| `pnpm test:e2e:task2`      | all `[Task 2]` + prerequisite E2E suites in `test/task2/`             |
| `pnpm test:e2e:task1`      | the original Task 1 E2E suite (regression)                            |
| `pnpm test`                | all unit tests (Task 1 + Task 2)                                      |
| `pnpm test:e2e`            | all E2E tests                                                         |
| `pnpm lint` / `pnpm build` | static checks                                                         |

Requires Node 22 (`nvm use`, see `.nvmrc`); the toolchain does not run on Node 18.

Test layout:

- `src/tasks/dto/*.spec.ts`: DTO rules, using `plainToInstance` + `validate` with `whitelist` and `forbidNonWhitelisted`. Whether `{}` is rejected is checked over HTTP only, because the layer that enforces it is your choice.
- `test/task2/validation.e2e-spec.ts`: POST/PATCH body validation through the real `configureApp()`.
- `test/task2/route-params.e2e-spec.ts`: `:id` handling for GET/PATCH/DELETE.
- `test/task2/error-handling.e2e-spec.ts`: error envelope, success formats, unexpected errors, status preservation.
- `test/helpers/`: app factory, error-envelope assertions. Each test gets a fresh app, so tests are independent of order and of generated ids.

Do not edit the tests to make your implementation pass. If you believe a test contradicts this specification, write down why before touching it.

## 7. Acceptance criteria

1. `pnpm test:e2e:task1-gate`, `pnpm test`, `pnpm test:e2e`, `pnpm lint` and `pnpm build` all pass.
2. Every rule in section 3 holds, including: no `null` accepted, no `{}` on PATCH, no `id`/`createdAt`/`completed` on POST, `0`/`-1`/`1.5`/`abc` ids rejected with `400`, missing tasks `404`.
3. Every error response matches the schema in section 3.D.
4. Validation rules are not needlessly duplicated, and each layer keeps its responsibility (section 4).
5. You can explain every decision listed in [EVALUATION.md](EVALUATION.md).
