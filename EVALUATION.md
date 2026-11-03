# Evaluation – Assignment 6 (100 points)

| Area | Points | What is judged |
|---|---:|---|
| Middleware implementation | 15 | unique server-generated id, metadata attached, header, `started`/`completed` entries, disabled mode, no secrets, registered for all routes, one `next()` |
| Interceptor implementation | 20 | one entry on every path, success and error, response and error untouched, async handlers, correct RxJS operators, config flag |
| Custom pipes | 15 | `ParseResourceIdPipe` and `PaginationPipe`: every invalid input rejected, defaults, maximum from config, error format, relation to `ParsePositiveIntPipe` |
| Custom providers and DI | 15 | config function, validation and fail-fast, provider pattern justified, injection by token, no hard-coded config, module boundaries, no circular imports |
| ExecutionContext and decorators | 15 | `@RequestMetadata()` via `ExecutionContext`, small responsibility, no leakage, `@CurrentUser()` reused, correct wiring of the demo routes |
| Metadata and Reflector | 5 | `@SkipRequestTiming()` records metadata only, method-over-class precedence, predictable default |
| Unit and E2E tests | 10 | all provided tests green and untouched, extra tests meaningful, no timing/format brittleness |
| Code quality and documentation | 5 | naming, small classes, types instead of `any`, `NOTES.md` answers the 14 questions and the design decisions |
| **Total** | **100** | |

## How each area is scored

### Middleware implementation (15)
- **Full (13–15):** every contract of Module A holds; the id is generated, never copied from the client; the header name is configurable; `completed` is logged from the right event; the url is sanitized in one place; applies to 401/403/404 responses; `next()` once.
- **Partial (5–12):** works on the happy path but misses one of: disabled mode, ignoring the client's id, the configured header, logging 401/404 requests, sanitizing query values, or duplicates the sanitizing logic.
- **Zero:** not registered, or no id, or secrets logged (see critical failures).

### Interceptor implementation (20)
- **Full (17–20):** exactly one `request.timing` entry on success and on error; correct status code for `HttpException` and other errors; same value / same error instance; subscribes once; honours the config flag and the skip metadata; the notes explain `tap` / `map` / `catchError` / `finalize` correctly.
- **Partial (7–16):** logs on success but not on error (or twice); wrong status on errors; changes or wraps the response; uses `map` for side effects; ignores a flag.
- **Zero:** throws `Not implemented`, never registered, or alters the response/error.

### Custom pipes (15)
- **Full (13–15):** all spec cases pass for both pipes; the maximum is read from the injected config; default `limit` respects the maximum; non-string / array inputs are rejected; messages name the parameter; the relation to `ParsePositiveIntPipe` is a deliberate reuse (not a copy) and explained; `GET /tasks` is wired and paginates.
- **Partial (5–12):** valid cases work but some invalid inputs slip through (`1e3`, `+2`, arrays, huge numbers), or the maximum is a constant, or the logic of `ParsePositiveIntPipe` is duplicated.
- **Zero:** pipes not implemented or not used by any route.

### Custom providers and DI (15)
- **Full (13–15):** `loadRequestProcessingConfig` is pure and complete; invalid values throw naming the variable; the object is frozen; the provider reads the environment when the module is created; at least one provider pattern used and justified; `AppModule` and `RbacModule` import the module; middleware, interceptor and pipe get the config by token.
- **Partial (5–12):** works with defaults but silently accepts bad values, reads `process.env` at import time, or the config is imported as a constant instead of injected.
- **Zero:** no provider, or configuration hard-coded.

### ExecutionContext and decorators (15)
- **Full (13–15):** `@RequestMetadata()` is implemented with `switchToHttp().getRequest()`, returns the whole object or one field, `undefined` when absent, and exposes only the four fields; the demo routes work for every role; the authenticated user comes from the existing `@CurrentUser()`.
- **Partial (5–12):** works but reads headers/user directly, throws when metadata is missing, or duplicates `@CurrentUser()`.
- **Zero:** placeholder left, or the controller reads `@Req()` to do the job.

### Metadata and Reflector (5)
- **Full (5):** the decorator stores the given boolean under the given key on class and method; the interceptor uses the right `Reflector` helper so that the method wins and "absent" means "timed".
- **Partial (2–4):** works for methods only, or precedence is wrong in one case.
- **Zero:** skipping is done with a hard-coded route list or not at all.

### Unit and E2E tests (10)
- **Full (9–10):** `pnpm test` green (610+ tests), provided tests untouched, `pnpm build` and `pnpm lint` clean, extra tests added for own decisions, the database e2e passes (once the `User.role` issue in the README is solved) or its failure is explained.
- **Partial (4–8):** a few provided tests red, or tests modified without justification.
- **Zero:** tests deleted, skipped or weakened.

### Code quality and documentation (5)
- **Full (5):** consistent with the codebase, small focused classes, no `any` where a type exists, comments only where they help, `NOTES.md` complete and in the student's own words.
- **Partial (2–4):** works but with duplication or thin notes.
- **Zero:** no notes.

## Critical failures

Any of these means the assignment is **not complete**, whatever the test results (the score is capped at 59):

- a token, cookie, password, body value or sensitive query value in a log entry
- a request id taken from the client
- a Task 5 authorization rule weakened (a guard removed, reordered, or a route open to anonymous callers)
- the interceptor changing the response body, the status or the error
- business logic or database access in the middleware or in the interceptor
- the provided tests edited to make them pass, or assertions weakened

Passing tests alone does not guarantee 100: the review reads the code for the quality of the RxJS, the registration choices and the answers in `NOTES.md`.

**Grade bands:** 90–100 excellent · 75–89 good · 60–74 pass · < 60 redo.
