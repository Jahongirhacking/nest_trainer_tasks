# Evaluation – Assignment 7 (100 points)

| Area | Points | What is judged |
|---|---:|---|
| Single and multiple file upload | 15 | both endpoints work, correct field names/status codes, thin controller, all-or-nothing multi-upload, metadata for every file, owner association |
| Multer configuration | 10 | limits (size, files, parts/fields), deliberate storage choice, configuration outside the controller, env-driven limits, 413/400 mapping |
| File validation and security | 20 | four validators, signature check against spoofing, extension/MIME consistency, empty/oversized files, safe error messages, no trust in client data |
| Storage abstraction and DI | 15 | interface + token + provider, `LocalStorageService` correctness, generated keys, containment, no overwrite, `MediaService` independent of `fs`, config function |
| Database metadata integration | 10 | entity, migration, FK/constraints/index, status lifecycle, consistency in both failure scenarios |
| Retrieval, download and deletion | 10 | list/get/download/delete behaviour, safe headers, deletion policy, missing-object handling |
| Ownership and authorization | 10 | 404 for others, admin rule, reuse of Task 4/5 (no second auth), Task 5 RBAC intact |
| Unit, integration and E2E tests | 5 | all given tests green and untouched, meaningful additional tests, no brittle assertions |
| Architecture and documentation | 5 | module boundaries, naming, types instead of `any`, `NOTES.md` answers the questions and justifies the decisions |
| **Total** | **100** | |

Security counts twice: a vulnerability costs points in its area **and** triggers a deduction from the list of critical failures below.

## How each area is scored

### Single and multiple file upload (15)
- **Full (13–15):** both endpoints satisfy the contract and the e2e tests; the controller only wires; multiple upload is truly all-or-nothing, including when the *second or last* storage call fails; every row belongs to the caller.
- **Partial (5–12):** single upload works but multiple upload leaves files after a failure, or statuses are wrong (e.g. 422, 200), or the controller contains business logic.
- **Zero:** handlers still answer 501, or files are accepted without being stored/recorded.
- **Critical:** the response contains the storage key or an absolute path.

### Multer configuration (10)
- **Full (9–10):** `limits.fileSize`, `files`, `fields`, `parts`, `fieldSize` set from validated configuration; storage chosen with a written justification; options built outside the controller; oversize → 413, too many files / unexpected field → 400.
- **Partial (4–8):** only size limited; limits hard-coded; unbounded MemoryStorage justified poorly; configuration inside the controller.
- **Zero:** Multer left with defaults (unbounded in-memory upload).
- **Critical:** an upload endpoint with no size limit.

### File validation and security (20)
- **Full (17–20):** all four validators correct and reusable; magic bytes checked for JPEG, PNG, WebP (including the RIFF/WAV trap) and PDF; declared type must match the content; extension rules (double extension, case, trailing characters) correct; empty files rejected; unknown content never accepted when it cannot be checked; messages safe.
- **Partial (7–16):** MIME and extension checked but the content is not (or only for some types); spoofed types accepted in one combination; validators duplicated or not reusable.
- **Zero:** validation relies on `Content-Type`/extension only.
- **Critical:** an HTML/SVG/executable upload can be stored and served back; client-provided MIME type is the only proof.

### Storage abstraction and DI (15)
- **Full (13–15):** `MediaService` depends only on `STORAGE_SERVICE`; the provider uses a factory/class with injected validated config; keys come from a CSPRNG and are relative; traversal and symlink escapes blocked; exclusive create, no overwrite, unique under concurrency; `delete` idempotent; a second implementation could be added without editing the service.
- **Partial (5–12):** works but the service imports `fs`/`path`, or keys contain user input, or traversal is checked only by string search, or an overwrite race exists.
- **Zero:** the filesystem is used directly from controller/service.
- **Critical:** the original file name or any user input becomes part of the path; the storage root is publicly served.

### Database metadata integration (10)
- **Full (9–10):** migration creates the table with FK, explicit `ON DELETE`, UNIQUE, NOT NULL, CHECKs, index, `timestamptz`; entity matches; status moves UPLOADING → ACTIVE only after storage success; both failure scenarios leave neither an ACTIVE row nor an object; notes explain the crash window and the cleanup job.
- **Partial (4–8):** missing constraints/index, or the status is always ACTIVE, or only one failure scenario is handled.
- **Zero:** metadata not persisted, or `synchronize` used instead of a migration.
- **Critical:** file content stored in PostgreSQL; `ON DELETE CASCADE` that orphans objects without cleanup.

### Retrieval, download and deletion (10)
- **Full (9–10):** list/get/download/delete as specified; stream (not a full in-memory copy) for download; `attachment` + `nosniff` + correct type; filename encoded safely for quotes, non-ASCII, control and very long names; deletion order and failure policy as documented and tested.
- **Partial (4–8):** works but `inline`, no `nosniff`, name concatenated into the header, or deletion removes the row before the object succeeded.
- **Zero:** endpoints not implemented.
- **Critical:** header injection through the file name; a path or key accepted from the client.

### Ownership and authorization (10)
- **Full (9–10):** every id-based operation checks ownership; others get 404 indistinguishable from "unknown id"; admin may read/download/delete but `GET /media` stays own-only; `JwtAuthGuard` reused, no new roles; Task 5 behaviour unchanged.
- **Partial (4–8):** checks missing on one operation, or 403 leaks existence, or an `if (role === ...)` in the controller.
- **Zero:** no authentication on the media routes.
- **Critical:** user A can read, download or delete user B's file by changing the id (IDOR).

### Unit, integration and E2E tests (5)
- **Full (5):** all given tests pass, none modified or skipped; additional tests cover your own decisions (cleanup failures, key format, headers).
- **Partial (2–4):** some given tests fail or were edited to pass; no additional tests.
- **Zero:** tests deleted, skipped, or weakened.

### Architecture and documentation (5)
- **Full (5):** clean module boundaries (`StorageModule` exports only the token), no circular imports, no `any` in public signatures, `NOTES.md` answers the ten questions and documents the decisions.
- **Partial (2–4):** decisions undocumented, or leaky boundaries.
- **Zero:** nothing documented.

## Critical failures (deductions on top of the area scores)

| Failure | Deduction |
|---|---:|
| IDOR: another user's file is readable/downloadable/deletable | −15 |
| Path traversal possible through name, extension or key | −15 |
| Spoofed content (HTML/script/executable) accepted and served back | −10 |
| Upload without a size/count limit | −10 |
| Internal path, stack trace, storage key or driver message in a response | −5 each (max −10) |
| Uploads reachable without authentication or from a public directory | −10 |
| Given tests edited, skipped or weakened to pass | −10 and the affected area counts as zero |
| Second authentication system or new roles introduced | −5 |

The total is never below 0.
