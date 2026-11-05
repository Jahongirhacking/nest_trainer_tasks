# Assignment 7 – Secure Media Upload Service: Multer, File Validation, Storage Abstraction

**Difficulty:** Advanced
**Builds on:** Assignment 6 ([docs/task_6/](docs/task_6/ASSIGNMENT.md)) and the authentication of Assignment 4 / RBAC of Assignment 5. Everything from Tasks 1–6 stays as it is.
**Stack:** NestJS 12, TypeScript, `@nestjs/platform-express` + Multer, TypeORM + PostgreSQL, Vitest + Supertest, pnpm, Node 24 (`.nvmrc`)

> Rule of the game: the interfaces, injection tokens, enums, the allowed-type table, the test helpers (fixtures, fake storage, test app) and **all tests** are given. **Upload handling, Multer configuration, the validators, the storage implementation, persistence, download, deletion and cleanup are yours.** Everything marked `TODO` is intentionally unfinished and throws `Not implemented` (or answers 501).
>
> You will only learn something if you write the file handling yourself. Nothing here is a hidden solution; `HINTS.md` has three levels, please read them in order.

## 1. Learning objectives

1. How `multipart/form-data` is built and how Multer parses it
2. What `FileInterceptor` / `FilesInterceptor` do, and where in the request lifecycle they run
3. Why a file name, an extension and a MIME type sent by the client prove nothing, and what *does* (the content)
4. `MemoryStorage` vs `DiskStorage`: memory pressure, temporary files, cleanup
5. A storage abstraction (interface + injection token + provider) that lets you replace the local disk with S3 / Cloudflare R2 without touching business logic
6. Metadata in PostgreSQL, bytes elsewhere, and keeping the two consistent when there is no shared transaction
7. Ownership checks that do not leak the existence of other users' files
8. Path traversal, unrestricted upload size, XSS through served uploads, header injection through file names
9. Testing uploads without a cloud account and without touching the real file system

## 2. Scope

**In scope:** `POST /media/upload`, `POST /media/upload/multiple`, `GET /media`, `GET /media/:id`, `GET /media/:id/download`, `DELETE /media/:id`; Multer configuration; four reusable validators; `StorageService` + `LocalStorageService`; `Media` entity + migration; ownership rules; error handling; tests you add yourself.

**Out of scope (do not build them):** S3 / R2 implementations (only keep the design open for them), image processing or thumbnails, virus scanning, resumable or chunked uploads, signed URLs, a background job queue, a new login mechanism, new roles or permissions. Do not touch the Task 1–6 logic.

## 3. The application you are extending

| Existing | Where | What it means for Task 7 |
|---|---|---|
| JWT authentication (`JwtAuthGuard`, "jwt" strategy loading the user from PostgreSQL) | `src/auth/` | **Reuse it.** `MediaController` already has `@UseGuards(JwtAuthGuard)`. Do not write a second auth system. |
| `@CurrentUser()` (typed with `role`) | `src/rbac/decorators/current-user.decorator.ts` | **Reuse it.** `request.user` is `{ id, email, role }`. |
| `Role.ADMIN` / `Role.USER` | `src/rbac/enums/role.enum.ts` | The only roles. Do not create new ones. |
| Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) + `GlobalExceptionsFilter` | `src/app.setup.ts`, `src/common/filters/` | Shapes every error (`statusCode`, `error`, `message`, optional `errors`). Unknown **text** fields of a multipart body hit this pipe. |
| `PaginationPipe`, `ParseResourceIdPipe` (Task 6) | `src/common/pipes/` | `ParseResourceIdPipe` is for integer ids; media ids are **UUIDs**, so think about what to use instead. `PaginationPipe` fits `GET /media`, but read the note in `query-media.dto.ts`. |
| `RequestProcessingModule` (request id, logging, timing) | `src/common/` | Already applies to the new routes. A request log must never contain file content or secrets. |
| Task 6 config pattern (`loadRequestProcessingConfig` + a `useFactory` provider + a token) | `src/common/providers/` | The model for `loadStorageConfig` / `loadUploadLimits`. |
| `autoLoadEntities: true`, `synchronize: false`, migrations only | `src/database/` | Entities are registered with `forFeature([...])`; the schema comes from a migration. |
| `InMemoryRepository` | `test/helpers/` | The fake repository used by `media.service.spec.ts`. |

**Integration decisions (fixed by the assignment):**
- Media ids are **UUIDs**; user ids stay integers (`uploadedById` references `users.id`).
- Authorization is by **ownership**, plus: `ADMIN` may read, download and delete any file (existing `Role.ADMIN`, no new permission). `GET /media` lists only the caller's own files, even for an admin.
- A file that belongs to someone else answers **404**, never 403 (do not confirm that the id exists).
- Only **ACTIVE** files are visible through the API.
- Tests use **Vitest**, not Jest, because the repository does.

## 4. How a multipart upload travels (read this before coding)

```text
Client                                        Server
------                                        ------
POST /media/upload
Content-Type: multipart/form-data; boundary=XYZ
Authorization: Bearer <jwt>
        |
        |  --XYZ
        |  Content-Disposition: form-data; name="file"; filename="cat.jpg"
        |  Content-Type: image/jpeg            <- all three are CLIENT-CHOSEN text
        |
        |  <raw bytes>
        |  --XYZ--
        v
 middleware          request id, logging (Task 6)
 guards              JwtAuthGuard: who are you? (401)        <- BEFORE the body is parsed
 interceptor         FileInterceptor -> Multer parses the stream, enforces limits,
                     puts the file in `req.file` (memory buffer or temp file)
 pipes               global ValidationPipe (text fields) + your file pipe (the file)
 controller          @UploadedFile() file  ->  MediaService
 service             validate state, store bytes via StorageService, save metadata
 filters             any exception -> JSON error envelope
```

Questions to answer in your `NOTES.md` (they are not answered anywhere in the repo):

1. Which stage can reject an oversized upload *before* all bytes are read, and which stage only sees it afterwards?
2. Why does the 401 for a missing token come before Multer touches the body?
3. What is in `file.buffer` with MemoryStorage and with DiskStorage? Who deletes the temp file when validation fails?
4. What happens to the process when 200 users upload 50 MB files into memory at the same time?
5. Name three things in a multipart part an attacker controls and one thing they do not.
6. Why is `file.mimetype` not evidence? What is?
7. Why is the original file name unusable as a storage name, and where *is* it still useful?
8. Why should a storage key come from a CSPRNG and not from a hash of the content or a counter?
9. Why must a downloaded upload carry `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`?
10. What can go wrong between "file written" and "row saved", and in which order do you do the two so the failure is cheap to repair?

## 5. Modules

### Module A – Single file upload (`POST /media/upload`)

Field name `file`; `multipart/form-data`; authenticated; `201` with the metadata (never the storage key, a path or the owner id):

```json
{
  "id": "6f1c0b7e-0b41-4b9a-9d2e-2c7a1b8c9d10",
  "originalName": "example-image.jpg",
  "mimeType": "image/jpeg",
  "extension": "jpg",
  "size": 245000,
  "category": "IMAGE",
  "status": "ACTIVE",
  "createdAt": "2026-11-05T10:00:00.000Z",
  "updatedAt": "2026-11-05T10:00:00.000Z"
}
```

Use `FileInterceptor`, `@UploadedFile()`, your file pipe, then `MediaService.uploadOne()`. The controller stays thin. A file sent under any other field name, or an unknown extra text field, is a `400`.

### Module B – Multer configuration (`src/media/config/`)

`buildMulterOptions(limits)` returns the Multer options: file size, file count, and finite limits for fields / parts / field size. You choose `storage` deliberately. Configuration lives outside the controller. `loadUploadLimits(env)` reads `MEDIA_MAX_FILE_SIZE_BYTES` (default 5 MiB) and `MEDIA_MAX_FILES` (default 5); the values come into the app through the `UPLOAD_LIMITS` token.

Explain in your notes: when MemoryStorage is acceptable, when DiskStorage is, what a large in-memory upload does to the process, why temporary files need cleanup, and why limits must exist even though the validators also check the size.

### Module C – File validation (`src/common/validators/`, `src/media/pipes/`)

Supported types only: **JPEG, PNG, WebP, PDF** (`ALLOWED_MEDIA_TYPES` in `media.constants.ts`). Four validators extend Nest's `FileValidator`:

| Validator | Judges | Must not trust |
|---|---|---|
| `MaxFileSizeValidator` | size, empty files | the reported `size` |
| `AllowedMimeTypeValidator` | declared MIME type, exact match | prefixes, wildcards |
| `AllowedExtensionValidator` | extension of the name, case-insensitive, consistent with the MIME type | double extensions, trailing dots/spaces, directory parts |
| `FileSignatureValidator` | the **bytes** (magic numbers) and that they match the declared type | everything the client wrote |

`createMediaFilePipe(limits)` composes them with `ParseFilePipe`. Missing file / invalid file → `400`; a file above Multer's limit → `413` (Nest maps Multer's `LIMIT_FILE_SIZE` for you – check it with the test, do not assume). Research the four signatures yourself. A signature check is necessary, not sufficient: write down what it does not prove.

### Module D – Multiple files (`POST /media/upload/multiple`)

Field `files`, `FilesInterceptor`, at most `maxFiles`. **Policy: all-or-nothing.** If any file is invalid or any storage/database step fails, no file of the request may remain stored or ACTIVE. Storage and PostgreSQL cannot share a transaction, so you need a compensation strategy (undo what already happened). Document it, including what you do when the *undo itself* fails.

### Module E – Storage abstraction (`src/storage/`)

`StorageService` (given): `upload`, `read`, `exists`, `delete`. `STORAGE_SERVICE` / `STORAGE_CONFIG` tokens (given). `LocalStorageService` (yours):

- the key is generated by the storage, from a CSPRNG; it is **relative** to the root; the original name never reaches the storage layer;
- no user input decides a path: the `extension` hint is untrusted; keys passed to `read` / `exists` / `delete` are validated and the resolved path must stay inside the root (also through symbolic links) → otherwise `InvalidStorageKeyError`;
- never overwrite; unique under concurrency;
- `delete` is idempotent; `read` of a missing object → `StorageObjectNotFoundError`;
- the root (`STORAGE_LOCAL_ROOT`, absolute, required, **no default**) must not be a directory the web server serves.

`MediaService` and the controller only see the interface. Prove that to yourself: could you write `S3StorageService` without editing `MediaService`?

### Module F – Metadata and database (`src/media/entities/`, `src/migrations/`)

Map the `Media` entity (fields in `media.entity.ts`) and write the migration (`1793880000000-CreateMedia.ts` is an empty skeleton – fill it or replace it with a generated one, never keep two). Requirements, all checked by `test/integration/media.int-spec.ts`: real FK to `users` with an explicit `ON DELETE` (never a silent `CASCADE` that orphans files), UNIQUE `storageKey`, NOT NULL where sensible, CHECK constraints (`size >= 0`, category, status), `timestamptz`, an index for "files of a user", `status` defaults to `UPLOADING`, no `bytea`.

**Lifecycle:** `UPLOADING` → bytes stored → `ACTIVE`. On failure `FAILED` or no row at all (your choice, documented). After any failed upload there is no `ACTIVE` / `UPLOADING` row and no object left in storage. Answer both scenarios in your notes: *(1)* file stored, database fails; *(2)* row created, storage fails. And: what cleans up a crash between the two steps?

### Module G – Retrieval and download

| Method | Path | Success |
|---|---|---|
| GET | `/media?category=&page=&limit=` | `200` array of metadata, own ACTIVE files, newest first |
| GET | `/media/:id` | `200` metadata |
| GET | `/media/:id/download` | `200` the bytes |
| DELETE | `/media/:id` | `204` no body |

The id comes from the URL, the file from the **database record** and the storage abstraction – never from a path sent by the client. Download headers: the validated `Content-Type`, `Content-Disposition: attachment` with a safely encoded name (RFC 6266 / 5987: quotes, non-ASCII, control characters, very long names), `X-Content-Type-Options: nosniff`. No upload is ever rendered inline.

### Module H – Deletion and cleanup

Verify ownership → delete the object → delete the metadata. Policy (tested): hard delete; an object that is already missing is not an error; if the **storage delete fails** the row is kept and the call fails (so a retry is possible); the client never sees storage error text. Document: sync vs async deletion, when you would prefer soft delete, and what a periodic cleanup job for `UPLOADING` / `FAILED` rows and orphaned objects would look like (you do not have to build it).

## 6. Security checklist

| Threat | Expected defence |
|---|---|
| File type spoofing (`.jpg` that is HTML or an ELF binary) | signature + MIME + extension consistency |
| Path traversal in name, key or extension | generated keys, containment check, symlink check |
| Unrestricted size / count | Multer limits **and** validator, finite parts/fields |
| Reading another user's file by changing the id | ownership in the service, `404` |
| Files reachable without authentication | root outside any static directory, no static route |
| Memory exhaustion | no unbounded MemoryStorage |
| Stored XSS (SVG / HTML served back) | only 4 types, `attachment`, `nosniff` |
| Header injection / broken headers via file name | encode the name, never concatenate it |
| Information leakage | no paths, stack traces, driver messages in responses |
| Accumulating junk | cleanup of failed uploads and temp files |

## 7. Error contract

| Situation | Status |
|---|---:|
| Missing file, wrong field name, unknown text field, invalid type/signature/extension, empty file, too many files, malformed id/query | 400 |
| Missing or invalid token | 401 |
| File of another user (non-admin) / unknown id / object missing in storage on download | 404 |
| File above the size limit | 413 |
| Storage or database failure | 500, body `Internal server error` only |

All errors use the existing envelope from `GlobalExceptionsFilter` (`test/helpers/api-error.ts` checks it).

## 8. Files in this task

```text
src/storage/
  interfaces/storage-service.interface.ts     StorageService, StoredObject           GIVEN
  storage.errors.ts                           InvalidStorageKeyError, ...            GIVEN
  tokens/storage.tokens.ts                    STORAGE_SERVICE, STORAGE_CONFIG        GIVEN
  config/storage.config.ts                    loadStorageConfig()                    TODO
  services/local-storage.service.ts                                                  TODO
  storage.module.ts                           provider registration                  GIVEN, review
src/media/
  enums/*, media.constants.ts, interfaces/media.interface.ts                         GIVEN
  entities/media.entity.ts                    only the primary key is mapped         TODO
  dto/upload-media.dto.ts, dto/query-media.dto.ts                                    TODO
  config/upload-limits.ts, config/multer.config.ts                                   TODO
  pipes/media-file.pipe.ts                                                           TODO
  media.service.ts                                                                   TODO
  media.controller.ts                         every handler answers 501              TODO
  media.module.ts                             not imported by AppModule yet          TODO
src/common/validators/                        4 validators                           TODO
src/migrations/1793880000000-CreateMedia.ts   empty skeleton                         TODO
test/helpers/media-fixtures.ts, fake-storage.ts, flaky-storage.ts, media-app.ts     GIVEN
```

Tests (all given; unit tests follow the repository convention `src/**/*.spec.ts` instead of `test/`):

| File | Needs | Covers |
|---|---|---|
| `src/common/validators/file-validators.spec.ts` | nothing | Module C validators |
| `src/media/pipes/media-file.pipe.spec.ts` | nothing | Module C pipe |
| `src/media/config/media-config.spec.ts` | nothing | Module B |
| `src/storage/config/storage.config.spec.ts` | nothing | Module E config |
| `src/storage/services/local-storage.service.spec.ts` | temp directory | Module E |
| `src/media/media.service.spec.ts` | nothing (fakes) | Modules A, D, F, G, H logic |
| `test/integration/media.int-spec.ts` | PostgreSQL test DB | Module F schema |
| `test/media.e2e-spec.ts` | PostgreSQL test DB + temp storage | everything over HTTP |
| `test/media-registration.e2e-spec.ts` | PostgreSQL test DB, `STORAGE_LOCAL_ROOT` | `MediaModule` is registered in the real `AppModule` |

## 9. Implementation checklist (suggested order)

1. Read section 4 and answer questions 1–5 in `NOTES.md`.
2. Entity + migration → `pnpm test:integration` for `media`.
3. `loadStorageConfig`, `loadUploadLimits`.
4. `LocalStorageService` → `pnpm vitest run src/storage`.
5. The four validators and `createMediaFilePipe` → `pnpm vitest run src/common/validators src/media/pipes`.
6. `buildMulterOptions`.
7. `MediaService` (single upload first, then `uploadMany`, list, get, download, remove) → `pnpm vitest run src/media`.
8. Controller wiring, `MediaModule`, **import `MediaModule` in `AppModule`**, add `STORAGE_LOCAL_ROOT` to your `.env`.
9. `pnpm test:e2e`.
10. Security review against section 6; finish `NOTES.md`.

## 10. Commands

```bash
pnpm vitest run src/common/validators src/media src/storage   # unit tests, no database
pnpm db:test:up && pnpm test:integration                       # schema tests
pnpm test:e2e                                                  # builds, migrates the TEST db, runs HTTP tests
pnpm test                                                      # all unit tests (Tasks 1-7)
```

## 11. Rules

- Do not edit or weaken a given test or helper. Extending the fake repository with a method you need is fine; changing what a test expects is not.
- Run Node 24 (`nvm use`). Never turn on `synchronize`.
- Do not add new dependencies without a reason written in `NOTES.md` (`multer` and `@types/multer` are already installed).
- Known state inherited from Task 6: `test/auth.e2e-spec.ts` › "is a real, verifiable HS256 token signed with the configured secret" depends on the order of JWT claims and fails; it is not part of this task.

## 12. Acceptance criteria

- All Task 7 tests green, all earlier suites unchanged (except the known test above).
- `MediaModule` is imported by `AppModule`; the application starts with a real `.env`.
- No response, log line or error message contains a filesystem path, a storage key or a driver message.
- `NOTES.md` answers section 4's ten questions and documents: MemoryStorage vs DiskStorage choice, the compensation strategy for single and multiple uploads, the deletion policy, what a signature check does not prove, and how you would add an S3 implementation.
