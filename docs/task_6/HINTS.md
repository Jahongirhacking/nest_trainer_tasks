# Hints – Assignment 6 (Request Processing System)

Open one level at a time. Try for at least 30 minutes before the next one. There is no complete solution here on purpose.

---

## Level 1 – Conceptual: which tool, and why

**Module A – middleware.**
- Middleware is the first thing that touches a request, before NestJS knows which controller, guard or handler will serve it. It sees `req`/`res` – the same objects Express gives any middleware – and nothing about the route's metadata.
- Ask yourself: what work *must* happen for every request, even one that a guard rejects or that matches no route? A request id is the classic example. Why can an interceptor not do that job?
- The listeners you attach to `res` are how you learn what happens *later*. Which `res` events does Node emit when a response is complete? Which one also fires when the client goes away?

**Module B – interceptor.**
- An interceptor wraps the handler. Everything before `next.handle()` runs "before", and whatever you do to the returned stream runs "after". Read what `CallHandler` is for: the handler does not run until something subscribes.
- Why does Nest use an `Observable` here and not a Promise? What can a stream do that a Promise cannot (think: several values, cancellation, composing steps)?
- Lay out three questions for every RxJS operator you consider: *does it change the value? does it run on errors? does it run on unsubscribe?* Then compare `tap`, `map`, `catchError` and `finalize` with those questions. One of them must not be used for logging.

**Module C – pipes.**
- A pipe transforms or validates **one argument** right before the handler. A DTO plus `ValidationPipe` describes the shape of a whole object with decorators. When is a few lines of code better than a class with five decorators? When is it worse?
- Where does the global `ValidationPipe` sit relative to a pipe you attach to a single parameter? Read `src/app.setup.ts`, then read the comment at the top of `src/common/decorators/positive-int-param.decorator.ts`. That comment describes a trap you will meet.

**Module D – custom providers.**
- You need an object that is *computed* (from the environment), *validated*, *shared*, and *replaceable in tests*. Which of the four provider recipes gives you each of those? Which one would you pick if the value were a constant? If it needed other providers injected?
- Why an injection **token** and not a class? What would `@Inject(...)` look like for something that is not a class?

**Module E – decorators.**
- A parameter decorator is a function that Nest calls with "the execution context" when it prepares the handler's arguments. What is in an `ExecutionContext` besides the request? Why does Nest not hand you `req` directly? (Think: HTTP, WebSockets, gRPC.)

**Module F – metadata.**
- A metadata decorator writes a key/value pair on a class or a method; `Reflector` reads it back. Which of the two places (handler, class) should win if both have a value? Check which `Reflector` helper encodes exactly that rule.

**Lifecycle questions (section 4).** The official documentation has a page called "Request lifecycle". Read it once, then close it and draw the diagram from memory *including* where exception filters catch things.

---

## Level 2 – Technical: the APIs

- Middleware: `NestMiddleware` (`use(req, res, next)`), `NestModule#configure(consumer: MiddlewareConsumer)`, `consumer.apply(...).forRoutes(...)`. The middleware class can have constructor injection; it must be registered through a module for that to work. Node: `res.on('finish', …)`, `res.setHeader(…)`, `crypto.randomUUID()`, `performance.now()` / `process.hrtime.bigint()` / `Date.now()`.
- Express: `req.originalUrl` keeps the full url (`req.url` is relative to the mount point); `req.ip`, `req.headers['user-agent']`.
- Interceptor: `NestInterceptor#intercept(context, next)`, `context.switchToHttp().getRequest()/getResponse()`, `context.getHandler()`, `context.getClass()`, `next.handle()`. RxJS: `tap({ next, error, complete })` (the object form), `catchError`, `throwError`, `finalize`. Registration: a provider with the `APP_INTERCEPTOR` token (global, but still created by DI inside its module) or `@UseInterceptors()` on a controller.
- `HttpException#getStatus()`; `instanceof HttpException`.
- Pipes: `PipeTransform#transform(value, metadata: ArgumentMetadata)`; `BadRequestException`. Attach with `@Param('id', ParseResourceIdPipe)` or `@Query(PaginationPipe)`. A pipe passed as a **class** is instantiated by Nest in the context of the module that owns the controller – so its constructor dependencies must be visible *there*.
- Providers: `{ provide: TOKEN, useValue | useClass | useFactory | useExisting }`, `@Inject(TOKEN)`, `inject: [...]` for factories, `exports` / `imports` for crossing module boundaries. `Test.createTestingModule(...).overrideProvider(TOKEN).useValue(...)` is how the tests swap your provider.
- Decorators: `createParamDecorator((data, ctx: ExecutionContext) => …)`; `SetMetadata(key, value)`; `Reflector#get`, `#getAll`, `#getAllAndOverride`, `#getAllAndMerge`.
- Testing: `vi.useFakeTimers()` fakes `Date`, `performance` **and** `process.hrtime`; `vi.advanceTimersByTimeAsync(ms)` moves them. `lastValueFrom(observable)` turns a stream into a Promise.

---

## Level 3 – Implementation direction

**Suggested order:** config function → provider → pipes → decorators → middleware → module wiring → interceptor → controller wiring. Run `pnpm test:request` after each step and read *which* tests turned green.

**Edge cases and common mistakes**

*Config*
- `Number('')` is `0`, `Number(' ')` is `0`, `Number('1e3')` is `1000`, `Number('0x10')` is `16`. A regular expression on the *string* first, then a number.
- `process.env` read at the top of a file runs at import time, not when the module is created. The provider spec changes the environment between two module creations.
- Freeze the object; make sure the test that passes `{}` really gets defaults and not the values of your shell.

*Pipes*
- Query values arrive as `string | string[] | object` (`?page=1&page=2`, `?page[a]=1`). A function that only handles strings is a bug.
- The id pipe returns a number, but the global `ValidationPipe` (`transform: true`) converts a parameter whose TypeScript type is `number` *before* your pipe sees it – and `Number('1e3')` is `1000`. Look at how `PositiveIntParam` avoids that, and at the type of `id` in the given `GET /tasks/:id` handler.
- Decide the default `limit` when `maxPageSize` is smaller than 10.

*Middleware*
- `res.statusCode` is only meaningful when the response is finished. Which event do you wait for?
- Registering with `forRoutes('*')` should include routes that do not exist; verify with the 404 test instead of assuming. If your Nest version warns about the wildcard, read the warning.
- Where does the sanitizing of the url live? You need it in more than one place (middleware, interceptor) – a single small function is better than two copies.
- If `config.requestLoggingEnabled` is `false`, do not even build the entries.

*Interceptor*
- On the *error* path `tap`'s `next` callback never runs; on the *success* path `error` never runs. Which callback of the object form covers "the stream ended"? Which would log twice if you combined it with `finalize`?
- `delay()` shifts values but **not** errors. (The given tests know that.)
- The status code on the success path: look at when Nest writes the status of the response relative to your `tap`. Check what you see for `GET` and think about `POST`.
- For errors, the interceptor sees the exception *before* the filter turns it into a response. How do you get a status code out of it?
- Exactly one entry. If you use more than one operator, which one owns the logging?
- Do not `catchError` and return something else; if you catch, you must rethrow the same error.
- `reflector.getAllAndOverride` takes `[handler, class]` in a specific order. Test it with the three combinations in the spec.

*Provider wiring*
- A global interceptor registered with `APP_INTERCEPTOR` *inside* `RequestProcessingModule` still applies to the whole app. It also needs `Reflector`, the config and the logger resolvable in that module – they are.
- `RbacModule` must be able to resolve `REQUEST_PROCESSING_CONFIG` for `PaginationPipe`. Import the module that **exports** it.

**Testing strategies**
- Run a single file: `pnpm vitest run src/common/pipes/pagination.pipe.spec.ts`.
- When an HTTP test fails, print `f.logs` – it is the array every entry goes to.
- To see what a real request looks like, start the app against the dev database and call `GET /tasks/my` with a token; check that the default sink prints one JSON line per entry.
- Mutation check: temporarily break your own code (return the wrong status, log twice, remove the header) and confirm a test notices.

---

## Level 4 – Design questions you should be able to defend

1. Why is the request id generated in a middleware and not in the interceptor or a guard? What would be lost?
2. Why must the id never be taken from the client, and what is the cost of that choice for a real distributed system?
3. Why does a `401` request have a `request.completed` entry but no `request.timing` entry? Where in the lifecycle does the guard sit?
4. Why does a request with a bad id still produce a `request.timing` entry (outcome `error`, status 400)?
5. Why `tap` and not `map` for logging? What would `map` break?
6. What is the difference between logging in `tap({ complete })` and in `finalize`? What would each do if the client disconnected?
7. Why is the limit *rejected* instead of reduced? What would a client that asks for 10 000 items experience in each design?
8. Why is `@SkipRequestTiming(false)` useful, and why is "no metadata means timed" the right default?
9. Could `ConfigService` from `@nestjs/config` replace the custom provider? What would you gain, what would you lose, and why was it not used here?
10. What would change if the interceptor were registered on one controller instead of globally?
