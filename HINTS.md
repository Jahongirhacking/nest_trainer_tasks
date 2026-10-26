# Hints – Task 2

Read progressively. Try the assignment first and open the next level only when you are stuck.

---

## Level 1 – Conceptual

- **`ValidationPipe`** is a pipe: it receives the raw value of a handler parameter, turns it into an instance of the parameter's class, validates it, and throws a `BadRequestException` if validation fails. It only acts on parameters that have a class type (a DTO *class*, not an interface).
- **class-transformer** converts plain JSON into class instances (`plainToInstance`) and lets you change values on the way (`@Transform`). **class-validator** reads decorators from the instance and produces `ValidationError`s. The order is always: transform, then validate.
- A **Create DTO** describes everything required to make a resource. An **Update DTO** describes a *partial* change: everything optional, but whatever *is* present must obey the same rules as on creation.
- Server-controlled fields (`id`, `createdAt`, `completed` on creation) are protected by **not being part of the DTO** plus a pipe setting that refuses undeclared properties, not by checking them by hand.
- **HTTP exceptions** (`BadRequestException`, `NotFoundException`, …) are how Nest code says "this request cannot succeed": throwing one makes Nest send the matching status and body. Returning an object with an `error` key from a handler is not the same thing: that is a `200`.
- Read the Nest docs: *Validation*, *Pipes*, *Exception filters*, and the class-validator README (`ValidateIf`, `IsOptional`, `Transform`).

---

## Level 2 – Structural

- **Where does validation belong?** Body rules → DTO classes plus the global pipe. Route parameter rules → a pipe on `@Param`. "Does this task exist?" → the service. Mixing these is what the architecture review looks for.
- **Reusing rules.** Compare the options before picking one: a shared base class, composing decorators into one custom decorator, or the mapped-type helpers (`PartialType`, `PickType`, … from `@nestjs/mapped-types`/`@nestjs/swagger`; check what is already installed and what adding a dependency costs). Each has trade-offs for "optional but not `null`" and for the empty-object rule. Decide, then be able to say why.
- **Body vs. parameter validation.** A body is validated as a whole object against a class; a route parameter is a single string that must be *parsed* (to a number) and *checked* (positive). Look at what the built-in parsing pipes check and, equally important, what they do not.
- **Filter vs. service exception.** A service exception says *what went wrong in the domain* (`NotFoundException`). An exception filter runs *after* an exception was thrown and decides *how it is rendered* in the HTTP response. A filter must not decide whether a request is valid. Ask yourself whether you need one at all: where is the error body for a validation failure actually built? Is there a hook closer to that place?
- Your service must stay HTTP-agnostic. If you write `@Req()`/`@Res()` in it, something is in the wrong layer.

---

## Level 3 – Debugging

**Optional fields**
- `@IsOptional()` skips *all* validators when the value is `undefined` **or `null`**. Is that what the spec says about `null`? Look for a decorator that skips only on a condition you control.
- A field that is optional in the update DTO must still be fully validated when it is present, including falsy values: `completed: false` is a value.
- With class fields and `useDefineForClassFields`, a DTO instance can have *own properties set to `undefined`* for fields the client never sent. Think about what that does to "is this object empty?" checks (`Object.keys`, `Object.values`, `Object.entries`).

**Unknown properties accepted**
- `whitelist` only *strips*; `forbidNonWhitelisted` is what turns stripping into an error, and it needs `whitelist: true`.
- A property is "known" only if it has **at least one class-validator decorator**. A declared property without decorators is still considered unknown.
- The pipe only runs if it is registered where the application under test sees it. Tests use `configureApp(app)`: a pipe created anywhere else (or only in `main.ts`) is invisible to them.
- A parameter typed as an interface, a `type` alias, or `any` has no runtime metadata, so the pipe has nothing to validate against.

**Wrong status codes**
- `ParseIntPipe` alone accepts `0` and `-1`. A `404` for `0` means nothing checked positivity.
- A `404` for a malformed id usually means the pipe order is wrong, or the lookup happens before validation. Parameter and body pipes run before the handler body.
- A `500` almost always means a plain `Error` (or a `TypeError` on `undefined`) escaped instead of a Nest exception.
- A `200` on `DELETE` instead of `204` is a `@HttpCode` question; a `201` on `PATCH` is not possible unless something is badly wrong.
- With global `transform: true`, the pipe also converts primitive route params to the declared TS type. Values like `"1e2"` or `"0x10"` can become valid numbers before your own pipe sees them, which is why the test-suite deliberately does not include them. Know why.

**Error shape**
- `ValidationPipe`'s default error is `message: string[]` with no field names. Check what options the pipe exposes for building the exception, and what the exception's constructor accepts as a body.
- The default 404 body already has `statusCode`, `message` and `error`. Do not rewrite what already conforms.
- If you write a filter with `@Catch()` (no argument), you also catch non-HTTP errors. What should happen to those?

**Tests that pass alone but fail together**
- Each test builds a new application and therefore a new in-memory store. If a test passes alone and fails in a group, your code probably keeps state at module level (a `let tasks = []` outside the class, a static counter), so state leaks between apps in the same process.
- Hard-coded ids (`/tasks/1`) work only when ids are predictable. Generated ids must not be assumed; the tests ask the API for ids.
- Random ids can collide in a long suite; if ids ever repeat, think about what generates them.
- Run one file at a time (`pnpm vitest run --config ./vitest.config.e2e.ts test/task2/validation.e2e-spec.ts`) and a single test with `-t "<name>"` to isolate.
