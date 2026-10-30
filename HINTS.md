# Hints – Assignment 4 (read level by level)

No level contains a finished method or a complete authentication flow.

## Level 1 – Concepts

- **Authentication vs. authorization**: authentication answers "who are you?" (401 when it fails); authorization answers "what may you do?" (403). This assignment is only the first.
- **Why hash passwords**: a database leak must not reveal passwords. A *password hash* is deliberately slow, salted and one-way. Fast hashes (SHA-256) are the wrong tool; encryption is reversible and also wrong. You never need the original password back, only to check a candidate against the hash.
- **Signed is not encrypted**: a JWT is three base64url parts. Anyone can read the payload; the signature only proves that someone holding the secret produced it and that it was not altered. Never put secrets in it. Decode one by hand to see.
- **Passport**: a small framework that standardises "run a strategy, and on success attach the result to `request.user`". Nest wraps it in `@nestjs/passport`.
- **Local strategy**: turns `{ email, password }` into "a user or a failure".
- **JWT strategy**: turns an `Authorization: Bearer …` header into "a user or a failure".
- **Guards**: decide, before the handler runs, whether the request may continue. That is why the *guard* connects Passport to your routes.
- **Custom decorator**: names an intent (`@CurrentUser()`) instead of repeating `req.user` plumbing.
- **Minimal claims**: the token is copied everywhere (logs, proxies, browsers). Put in it only what you need to find the user again.
- **Valid token ≠ existing user**: the signature can be perfect for an account deleted a minute ago. Decide what the server re-checks on every request, and what that costs.

## Level 2 – Structure

- **Modules**: `UsersModule` owns the repository and exports `UsersService`. `AuthModule` imports `UsersModule`. `AuthModule` also needs `PassportModule` and `JwtModule`, plus providers for strategies, guards and the `JWT_CONFIG` token.
- **Where hashing lives**: in the auth layer, as plain functions next to `AuthService`; `UsersService` only stores what it is given and never sees a plaintext password.
- **Local flow**: guard → strategy `validate(email, password)` → `AuthService.validateUser()` → `UsersService.findByEmail()` + hash verification → safe user → `request.user` → controller → `AuthService.login()`.
- **LocalAuthGuard**: a guard bound to the strategy *name* `'local'`. If the strategy is not registered under that name the guard has nothing to run.
- **Token issuance**: only after authentication succeeded. The signing options (secret, lifetime, issuer, audience) must agree with the verifying options in the JWT strategy; both should read the same `JWT_CONFIG`.
- **JwtAuthGuard**: same idea with the name `'jwt'`; put it where a route must be protected, not as a global default (Task 1–3 routes stay public).
- **JwtStrategy**: Passport options handle extraction, signature, expiry; your `validate()` handles *meaning*: is `sub` something you issued, and does that user still exist?
- **Returning from `validate()`**: whatever it returns becomes `request.user`. Build it from the database row, minus secrets.
- **CurrentUser**: a decorator factory receives the optional argument you pass (`'email'`) and the execution context; from the context get the HTTP request.
- **Config**: use the same `.env` loading approach `AppModule` uses for the database, and build `JWT_CONFIG` through a provider factory so a mistake aborts startup. Remember that `JwtModule` can be configured asynchronously from a provider.
- **Normalizing email**: define it once and call it wherever an email enters (DTO, `register`, `validateUser`).
- **Login 400 vs. 401**: guards run before pipes, so the local strategy sees the raw body. Decide where the body gets validated *before* credentials are checked. There is more than one place that works; pick one and be able to justify it.
- **Migration**: finish and register the entity, then follow `src/migrations/README.md`, and read the SQL.

## Level 3 – Debugging

| Symptom | Likely cause |
|---|---|
| `Nest can't resolve dependencies of the LocalStrategy / JwtStrategy / AuthService` | provider missing in `AuthModule`; `UsersService` not exported/imported; `JWT_CONFIG` provider not registered; `JwtService` missing (is `JwtModule` imported?) |
| `Unknown authentication strategy "local"` / `"jwt"` | strategy not a provider, not imported anywhere, or registered under a different name than the guard asks for |
| `UnauthorizedException` on login with *correct* data and no strategy call | `usernameField` still `username` while the body sends `email` (Passport then sees "missing credentials") |
| Guard works but `request.user` is `undefined` in the controller | `validate()` returned `null/undefined`, or the controller reads another property |
| Every token is rejected, including fresh ones | signing secret ≠ verifying secret; one side reads `process.env` before `.env` is loaded; algorithm mismatch; issuer/audience set on one side only |
| Tokens never expire / expire instantly | `expiresIn` given as a bare number (seconds) vs. a string (`"15m"`); lifetime set in only one place; clock units (`iat`/`exp` are *seconds*) |
| Token works from a header but a test sending it another way fails | bearer extraction: only `Authorization: Bearer <token>` is allowed; the query string must not work |
| `Cannot read properties of undefined (reading 'passwordHash')` | the lookup returned `null` (unknown email) and the code kept going; or `select: false` hid the hash from the lookup login needs |
| Verification always false | hashing a trimmed password but verifying the original (or the reverse); verifying against the wrong column; comparing the plain strings |
| `TypeORM: no metadata for "User"` / table missing | entity not decorated or not in `forFeature`; migration not generated or run; test DB rebuilt before `pnpm build` ran |
| Circular dependency warnings | `UsersModule` importing `AuthModule`, or two services injecting each other; dependencies must point one way |
| `QueryFailedError … duplicate key` reaches the client | the unique violation is not translated (see `postgres-errors.ts`), or the error is thrown outside the `try` (a missing `await` in a `try/catch` again) |
| Two parallel registrations both succeed / one returns 500 | relying on "check then insert" instead of the unique constraint |
| Auth tests pass alone but fail together | shared database state; tests run one file at a time against a truncated database, do not depend on ids or on leftover rows |
| Startup does not fail without a secret | the config function is never called at startup, or an empty string is treated as "set"; remember `.env` only fills variables that are *missing* |
| Login returns 401 instead of 400 for a body without `email` | the guard ran first: validate the body before the strategy authenticates |
| Passwords or hashes appear in logs | an exception filter or a debug `console.log` prints the request body or the entity |
