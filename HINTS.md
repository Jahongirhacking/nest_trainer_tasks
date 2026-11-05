# Hints – Assignment 7 (Secure Media Upload Service)

Open one level at a time. Try for at least 30 minutes before the next one. There is no complete solution here on purpose.

---

## Level 1 – Conceptual

**What Multer does.** `multipart/form-data` is a body made of *parts* separated by a boundary. Each part has headers (`name`, `filename`, `Content-Type`) and a body. Express does not parse it; Multer (built on a streaming parser) does. It enforces limits while reading, then exposes the result as `req.file` / `req.files`. Everything in the part *headers* was written by the client.

**What `FileInterceptor` does.** It is a Nest interceptor that runs Multer for you on the Express request and converts Multer's errors into HTTP exceptions. Ask yourself: at which stage of the lifecycle does it run relative to guards and pipes? What does that mean for an unauthenticated upload of 2 GB?

**Why abstract the storage.** `MediaService` wants to say "keep these bytes, give me a handle, later give me the bytes back, later forget them". Whether that means a directory, S3 or R2 is infrastructure. If `MediaService` imports `fs`, replacing the disk means rewriting business logic and every test. A narrow interface + an injection token = replaceable and fakeable.

**Why metadata goes into the database.** Listing "my files", filtering, ownership, unique keys, constraints and joins are database jobs. Putting bytes in PostgreSQL makes backups, memory use and queries painful; object stores are built for bytes. The row is the *index* of the file and the source of truth for who may see it.

**Why the MIME type cannot be trusted.** `Content-Type: image/jpeg` is a string in a header the client typed. So is the file name and its extension. What would a tool like `curl -F` let you send? Think about what *kind of information* about a file cannot be faked cheaply, and where in the file it lives.

**The consistency problem.** Two systems (disk, database), no shared transaction. Whatever order you pick, a crash or an error between the two steps leaves something half-done. Which half is cheaper to find and clean: a row without a file, or a file without a row? How would you recognise each?

**Ownership.** "Is this id valid?" and "is this *your* id?" are different questions. What does a `403` tell an attacker that a `404` does not?

---

## Level 2 – Technical: which APIs

- `@nestjs/platform-express`: `FileInterceptor(fieldName, options)`, `FilesInterceptor(fieldName, maxCount, options)`, `FileFieldsInterceptor([...])`. Multer options: `limits` (`fileSize`, `files`, `fields`, `parts`, `fieldSize`, `headerPairs`), `storage` (`memoryStorage()`, `diskStorage({...})`), `fileFilter`.
- Parameter decorators: `@UploadedFile(pipe)`, `@UploadedFiles(pipe)`. Read what is in `file`: `originalname`, `mimetype`, `size`, `buffer` *or* `path`.
- `ParseFilePipe` (`validators`, `fileIsRequired`, `errorHttpStatusCode`, `exceptionFactory`), `ParseFilePipeBuilder`, built-in `MaxFileSizeValidator` and `FileTypeValidator`. Read their source: what does `FileTypeValidator` actually look at? Why are the project's own validators named like Nest's?
- `FileValidator` (abstract class): `isValid(file)` and `buildErrorMessage(file)`. A validator can be async.
- How Nest maps Multer's errors: look for `LIMIT_FILE_SIZE`, `LIMIT_FILE_COUNT`, `LIMIT_UNEXPECTED_FILE` in `@nestjs/platform-express/multer/multer/multer.utils.js` and see which HTTP exception each becomes.
- Files: `node:fs/promises` (`open` with the `wx` flag, `mkdir` with `recursive`, `rm`, `realpath`, `stat`, `createReadStream`), `node:path` (`resolve`, `relative`, `sep`, `isAbsolute`), `node:crypto` (`randomBytes`, `randomUUID`).
- Responses: `StreamableFile`, `@Res({ passthrough: true })`, `res.set(...)`, `@Header()`. Look at RFC 6266 / RFC 5987 for `filename*=UTF-8''...`.
- Providers: `Provider` with `useFactory` + `inject`, `overrideProvider(TOKEN).useValue(...)` in tests (see `test/helpers/media-app.ts`).
- TypeORM: `@Entity`, `@PrimaryGeneratedColumn('uuid')`, `@Column({ type, length, unique })`, `@ManyToOne(() => User, { onDelete })` + `@JoinColumn`, `@Index`, `@Check`, `@CreateDateColumn({ type: 'timestamptz' })`; `pnpm migration:generate`.
- Tests: `Test.createTestingModule`, `getRepositoryToken(Media)`, supertest `.attach(field, buffer, { filename, contentType })`.

---

## Level 3 – Implementation direction

**Suggested sequence.** Follow the checklist in `ASSIGNMENT.md` section 9. Run the single spec file of the piece you are writing (`pnpm vitest run src/storage`), read *which* tests turned green, and only then move on. The e2e tests are the last thing to look at, not the first.

**Validation strategies.**
- Layer cheap checks before expensive ones: presence → size → declared MIME → extension → content. Each validator should do one thing.
- A signature check compares the *first bytes* with a table you write yourself. Some formats need more than a prefix (a container format has a prefix shared with unrelated formats). Check the tests for the one that does.
- Keep the type table in one place (`ALLOWED_MEDIA_TYPES`); do not repeat the strings in four files.
- Decide what the validators do when `file.buffer` is missing (DiskStorage). A validator that "cannot check" must not answer `true`.
- Do not reflect the user's file name into error messages without thinking about what a message with newlines or HTML does in a log.

**Storage design.**
- A key like `ab/cd/<32 hex chars>.<ext>` gives a CSPRNG name and a fan-out so one directory does not hold a million files. You decide the layout; the tests only require safe characters and relative keys.
- Validate a key *before* touching the disk, then resolve and verify the result is inside the root. A string test for `..` alone is not enough: think about absolute paths, backslashes, encoded forms and symbolic links (`realpath`).
- To not overwrite: create with exclusive flags (`wx`) and retry with a new key on `EEXIST`, instead of "check then write".
- Make writes safe against a half-written file being read (write to a temporary name in the same directory, then rename) – and then think about what a crash leaves behind.

**Where the logic belongs.**
- Controller: wiring only. Service: policy (ownership, order of operations, compensation). Storage: bytes and keys. Config functions: parsing environment variables.
- The service never builds a path and never imports `fs`. If you catch yourself writing `join(` in `MediaService`, stop.

**Order of operations (think before choosing).**
1. Insert the row as `UPLOADING`, store, set `ACTIVE`; on error mark `FAILED`/delete and delete the object.
2. Store first, insert row `ACTIVE`; on error delete the object.
Compare the failure windows of both, then compare them for the multi-file case. Whatever you choose, an error in the *cleanup* must not hide the original error and must not leak to the client.

**Error handling.**
- Throw Nest exceptions from the service for expected cases (`NotFoundException`, `BadRequestException`); let unexpected errors become the generic 500 of the global filter, but make sure *their messages never reach the body* and are logged somewhere you can find them.
- Map storage errors to domain errors in the service (`StorageObjectNotFoundError` on download → 404).

**Queries.**
- Ownership belongs in the `where` (`id` + `uploadedById`) or in an explicit check right after loading; either way an unknown id and someone else's id must behave identically.
- The fake repository only supports plain equality, `find` (`where`, `skip`, `take`), `findOne`, `save`, `remove`, `count`. Sorting and `In()` need real PostgreSQL – extend the fake if you need more, or sort in the e2e tests' domain.

**Testing techniques.**
- Failure injection: `FakeStorageService.failUploadAt`, `failDelete`; make the fake repository's `save` throw only after the storage got a file (see `media.service.spec.ts`).
- Look at a directory before and after (`listFiles`) instead of asserting on a return value alone.
- For downloads, collect the response as a Buffer (`.buffer(true).parse(...)`) and compare bytes.

**Common security mistakes.**
- Using `file.originalname` (or its extension) to build the path or the header.
- Trusting `file.mimetype` / `file.size`.
- Creating the storage directory under `public/` or serving it with `ServeStaticModule`.
- `Content-Disposition: inline` and the stored `Content-Type` for user content.
- Returning the entity directly (it contains `storageKey`).
- A 403 for other users' files, or a different message for "missing" and "not yours".
- Catching an error and returning `error.message`.
- Cleaning up only on the happy path of validation, not when Multer rejects the request.
- "Check that the file does not exist, then write it" (race).
- No limit on the number of parts, only on the size of the file.
