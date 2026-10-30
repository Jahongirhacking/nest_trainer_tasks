# Evaluation – Assignment 4 (100 points)

| Area | Points | What is judged |
|---|---|---|
| Registration and input validation | 10 | DTO rules (email, 12–128 password, never trimmed), unknown/client-controlled properties rejected, normalization in the right places, 400/409 behaviour |
| Password hashing and secure verification | 15 | maintained algorithm (Argon2id preferred), hash-before-persist, library verification, no plaintext anywhere, no hash in output, no logging, hashing responsibility clearly placed |
| Passport Local Strategy | 10 | correct strategy name and `email` field, delegation to `AuthService`, one generic failure message, no verification inside the strategy, safe principal |
| JWT issuance and configuration | 15 | minimal claims, explicit short expiry, issuer/audience agreement, secret from validated configuration, no fallback, startup failure, algorithm pinned |
| Passport JWT Strategy | 15 | bearer-only extraction, signature/expiry/issuer/audience enforced, `sub` validated, current user loaded from PostgreSQL, deleted user → 401, principal built from the database, no untrusted claims |
| Authentication guards and protected endpoints | 10 | both guards correct, handlers never run on failure, `/auth/me` and `/auth/protected` correct, public Task 1–3 routes untouched |
| CurrentUser decorator and module architecture | 5 | decorator behaviour and use, `UsersModule`/`AuthModule` boundaries, DI, exports, no repository in controllers, no circular imports |
| Error handling and information disclosure | 5 | consistent envelope, 401 vs 403 vs 404 used correctly, identical unknown-email / wrong-password response, no internals leaked |
| Unit, integration and E2E tests | 10 | all provided suites green, tests untouched, any extra tests meaningful and isolated |
| Code quality and maintainability | 5 | naming, small focused methods, consistency with the codebase, comments only where they add value |

Passing tests alone does not guarantee 100: the review looks at architecture, security assumptions, dependency injection and error handling, and you should be able to defend each decision (why Argon2id, why `sub` only, why the user is reloaded, where login validation happens).

## Critical security failures

Any of these means the assignment is **not complete**, whatever the test results (the score is capped at 59):

- a plaintext password, or the hash, stored in a place it should not be, returned by any endpoint, put in a token, or written to a log
- passwords hashed with a fast general-purpose hash, or encrypted reversibly
- a JWT secret hard-coded in source, committed, or silently defaulted when configuration is missing
- tokens accepted without signature or expiry verification (including `alg: none`), or accepted from the query string
- identity taken from the request body, query string or an unverified token claim
- login responses that reveal whether an email exists
- a `.env` containing real credentials committed
- a "logout" or "roles" feature that pretends to provide revocation or authorization that does not exist
- Task 3 migrations edited or existing data dropped

**Grade bands:** 90–100 excellent · 75–89 good · 60–74 pass · < 60 redo.
