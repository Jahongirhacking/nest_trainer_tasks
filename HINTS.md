# Hints

Read progressively. Try the assignment first; open the next level only when you are stuck.

---

## Level 1 – Conceptual hints

- A **module** (`@Module`) groups related building blocks. It lists `controllers` and `providers`, and may `imports` other modules.
- A **provider** is anything Nest can inject. A class marked `@Injectable()` and listed in `providers` becomes a provider.
- **Constructor injection**: when you declare a constructor parameter typed with a provider class, Nest creates/reuses the instance and passes it in. `private readonly x: X` in the constructor parameter list both declares and assigns a field.
- A **controller** (`@Controller('prefix')`) maps HTTP requests to methods with `@Get`, `@Post`, `@Patch`, `@Delete`.
- Request data is extracted with parameter decorators: `@Param`, `@Body`.
- A **pipe** transforms or validates incoming values. Nest ships `ParseIntPipe` and `ValidationPipe`.
- `ValidationPipe` works with **DTO classes** decorated by `class-validator` (`@IsString`, `@MinLength`, `@MaxLength`, `@IsOptional`, `@IsBoolean`, …). The class must exist at runtime, which is why DTOs are classes and not interfaces.
- `class-transformer`'s `@Transform` can change a value before validation runs.
- `ValidationPipe` options worth reading about: `whitelist`, `forbidNonWhitelisted`, `transform`.
- `@HttpCode()` changes the default status code of a route (POST defaults to 201, others to 200).
- Nest ships exception classes such as `NotFoundException` and `BadRequestException`; throwing one produces the matching HTTP response automatically.
- Look at the Nest docs pages: Modules, Controllers, Providers, Pipes, Validation, Exception filters.

---

## Level 2 – Structural hints

- **TasksModule**: declares the controller and the service, nothing else. **AppModule**: only imports `TasksModule`.
- **DTOs**: contain only the shape of the data plus validation decorators. No logic. `UpdateTaskDto` has the same rules as `CreateTaskDto` for the shared fields, but every property is optional. Think about what "optional" should mean for a value of `null`.
- **Global pipe**: configure `ValidationPipe` once, in `configureApp()`. Think about which option turns unknown properties into an error rather than silently dropping them.
- **Controller** responsibilities: routing, extracting `id`/body, parsing the id, choosing the status code, calling the service. Nothing else.
- **Service** responsibilities: the array, the id counter, creating the task object (defaults and timestamps), finding, updating, deleting, and throwing `NotFoundException`.
- **Id validation**: decide where "positive integer" is checked. Compare what `ParseIntPipe` accepts with what the assignment demands (`0`, `-1`).
- **Empty PATCH body**: decide where it should be detected – validation layer, controller, or service – and justify the choice. Which layer owns "input shape" vs "business rules"?
- **Partial update**: merge only the properties that were actually provided; be careful with properties that exist on an object but have the value `undefined`.
- **Returning data**: think about whether returning a stored object directly lets callers mutate your storage.
- **DELETE**: nothing to return; make sure the response status and body match the spec.
- Implementation order that works well: module wiring → service → controller → DTOs → global pipe → edge cases (ids, empty PATCH).

---

## Level 3 – Debugging hints

**Dependency injection**
- `Nest can't resolve dependencies of the TasksController` → the service is not in `providers`, or the constructor parameter has no type, or the class is not `@Injectable()`.
- `this.tasksService is undefined` → you forgot the constructor, or you pass a method as a callback and lost `this`.
- Never `new TasksService()`: you'd bypass the container and tests that substitute the service will break.
- `import type { TasksService }` removes the runtime reference that DI needs. Use a regular import for injected classes.

**DTO validation**
- Nothing is validated → the DTO has no decorators, or the controller parameter is typed with an `interface`/`import type` instead of the class.
- With `import type { CreateTaskDto }` the pipe cannot see the class. Use a normal import for DTOs used in decorated signatures.
- `@IsOptional()` skips *all* validators when the value is `undefined` **or `null`**. A test sends `null`; check whether your validator still rejects it.
- A whitespace-only or padded title: validators see the raw string unless you transform it first. Check the order of `@Transform` and the validators.
- Compiled class fields may exist with the value `undefined` after transformation; this matters for "empty body" checks.

**Global ValidationPipe configuration**
- Pipe registered in `main.ts` only → E2E tests use `configureApp`, so they never see it. Register it in `configureApp` (or via `APP_PIPE`).
- Registered twice → duplicate work, confusing behavior.
- Unknown properties silently accepted → missing option; silently *stripped* is not the same as *rejected*.
- Without `transform: true` route params and bodies are not converted to the declared types.

**Route parameters**
- `@Param('id')` is always a string until a pipe converts it.
- `ParseIntPipe` accepts `-1` and `0`; the assignment does not.
- Route order matters only with overlapping paths; here it does not, but keep `:id` routes after the static ones as a habit.
- `Number('')` is `0`, `Number('1.5')` is `1.5`, `parseInt('1abc')` is `1` – be careful with lenient parsing.

**HTTP exceptions**
- Returning `null`/`undefined` for a missing task gives `200`/empty. Throw `NotFoundException` instead.
- Throw exceptions from the service (it knows the task is missing), not from a controller `if`.
- DELETE returning `200` with a body → missing `@HttpCode`.
- Don't catch exceptions just to rethrow them.

**PATCH validation**
- Every property is optional, but the *body* must contain at least one allowed property.
- `{ "completed": "true" }` must be rejected: no implicit conversion should make a string a boolean.
- Test your merge: sending only `completed` must not erase `title`.
- `id` / `createdAt` must be *rejected*, not silently ignored.

**Unit-test isolation**
- Service tests create a fresh module each time; state stored in a module-level variable or a `static` field leaks between tests and breaks them.
- Controller tests replace the service with a mock; if they fail because of the service's internals, your controller is doing too much.
- A failing test that passes alone but fails with others means shared state.
- Read the failing assertion first; it states the expected value.
