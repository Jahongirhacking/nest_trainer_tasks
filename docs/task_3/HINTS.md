# Hints – Assignment 3 (read level by level)

## Level 1 – Concepts

- **ORM**: maps rows to objects, so you work with classes instead of hand-written SQL strings. TypeORM does this with decorators.
- **Entity**: a class that describes one table (columns, keys, relations). It is *not* a DTO: the entity describes storage, the DTO describes what a client may send.
- **Repository**: an object bound to one entity that offers `find…`, `save`, `delete`, … It keeps data access out of your controllers and makes services testable (swap it for a fake).
- **Injection**: `TypeOrmModule.forFeature([Entity])` registers a repository provider; `@InjectRepository(Entity)` asks Nest for it. The module that owns a service must import the `forFeature` of every entity that service injects.
- **Many-to-One / One-to-Many**: many tasks point at one project. The *Many-to-One* side (task) owns the foreign key column; the *One-to-Many* side (project) is the inverse and has no column of its own.
- **DTO validation vs. constraints**: a DTO protects the API; a constraint protects the data from *every* writer (bugs, scripts, concurrent requests). You need both. A pre-check query can be wrong a millisecond later; a unique index can't.
- **Migrations**: versioned, reviewable, reversible schema changes. `synchronize` guesses and can destroy data.
- **Persistence**: an array lives and dies with the process and is private to it; a database outlives restarts and is shared by many requests/instances, so concurrency becomes your problem.

## Level 2 – Structure

- `ProjectsModule`: controller + service + `TypeOrmModule.forFeature([Project])`. `TasksModule`: controller + service + `forFeature([Task])`. Tasks must know whether a project exists: either export `ProjectsService` from `ProjectsModule` and import that module, or also register `Project` in `forFeature` of `TasksModule`. Pick one and be able to justify it. Don't make the two modules import each other.
- `autoLoadEntities: true` is already on, so `forFeature` registration is what makes TypeORM aware of an entity.
- Keep `entities/` (storage) and `dto/` (API) separate; DTOs may use `Entity['field']` types, entities never import DTOs.
- Relation sketch (names only): on Task a `@ManyToOne` to Project together with an explicit `projectId` column bound via `@JoinColumn`; on Project a `@OneToMany` back. Decide the `onDelete` behaviour deliberately.
- Column types: use explicit lengths (`varchar(100)`), nullable description, `@CreateDateColumn` / `@UpdateDateColumn`, a boolean with a default.
- Service shape: each method = one clear repository call + translating "no row" to `NotFoundException`. `findOne` returns `null`, `findOneByOrFail` throws – choose consciously.
- Deleting a project: three honest options – (a) count tasks first then delete, (b) just delete and translate the FK error, (c) both. Think about which stays correct under concurrency.
- Update: `repository.update()` returns only an affected count; `save()`/`preload()` returns the entity. Decide how you return the updated row and how `updatedAt` gets refreshed.
- Migrations live in `src/migrations`. Generate after finishing the entities, read the SQL, rename if you like, run, revert, run again.
- Test database: already wired (`TEST_DB_*`, `docker compose up -d postgres-test`, reset + migrate in `test/global-setup.ts`). You only need your migration to be correct.

## Level 3 – Debugging

| Symptom | Likely cause |
|---|---|
| `Nest can't resolve dependencies of the XService (?)` | missing `@InjectRepository(Entity)`, or the entity isn't in this module's `forFeature`, or the module doesn't import the other module / the other module doesn't `exports` the provider |
| `No metadata for "Project" was found` / `Entity metadata for Task#project was not found` | class has no `@Entity()`, it's not registered (`forFeature`), or the related class isn't registered anywhere |
| `ReferenceError: Cannot access 'Project' before initialization` | circular import between the two entity files under ESM + decorator metadata. Use TypeORM's `Relation<T>` wrapper for the property type and lazy arrow functions in the decorators (`() => Project`) |
| `relation "task" does not exist` | migration didn't run / wasn't built: `pnpm build` then check `pnpm migration:show` |
| `No changes in database schema were found` | entities are not decorated yet, or the migration was already applied |
| Migration CLI can't connect | `.env` missing or `DB_*` wrong; the CLI uses the dev database |
| `QueryFailedError … 23505` | unique violation – this is the *expected* failure for duplicate names; check `error.driverError.code` and `constraint`, don't match on message text |
| `23503` on task insert vs. on project delete | same code, different meaning: parent missing (→ 404) vs. children exist (→ 409). Decide using which operation you were doing |
| Everything returns 409 | your `catch` is too broad |
| `projectId` always `undefined` | relation exists but no explicit `projectId` column is mapped |
| Circular JSON / huge responses | you returned entities with loaded relations both ways; return plain fields or select explicitly |
| Tests see data from other tests | they use `resetDatabase()`; if you add tests keep using it and never rely on fixed ids |
| Project deletion sometimes 500 under load | the check-then-delete race: the FK error from `delete` isn't being translated |
| Unit test: "Cannot read properties of undefined (reading 'x')" on the repo | you used a repository method the unit fake doesn't implement (see list in `test/helpers/fake-repository.ts`) |
| `ECONNREFUSED` in tests | `pnpm db:test:up`; wait for the container to be healthy |
