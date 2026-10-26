# Evaluation Rubric – Task 2 (100 points)

| Category | Points |
| -------- | -----: |
| DTO validation correctness | 25 |
| Global `ValidationPipe` configuration | 15 |
| Route parameter validation | 10 |
| Correct HTTP exceptions and status codes | 15 |
| Error-response consistency | 10 |
| Architecture and separation of responsibilities | 10 |
| Automated tests and test quality | 10 |
| TypeScript correctness and maintainability | 5 |
| **Total** | **100** |

> **Passing the automated tests does not guarantee full marks.** Tests verify observable behavior. Design decisions, duplication, layering and readability are reviewed by reading the code, and points are never awarded automatically from test results.

## Criteria

### DTO validation correctness (25)
- Title rules: required, string, trimmed length 3–100, whitespace-only rejected, `null`/wrong types rejected (8)
- Description rules: optional, string, ≤ 500, `null` rejected (5)
- Update DTO: independent optional fields, `completed` is a strict boolean, `null` rejected, empty object rejected (8)
- `id`, `createdAt`, `completed` cannot be supplied on creation; `id`, `createdAt` cannot be supplied on update (4)

### Global `ValidationPipe` configuration (15)
- Registered once, globally, in a place the tests exercise (`configureApp` or `APP_PIPE`) (5)
- Unknown properties are rejected, not silently stripped or persisted (5)
- Transformation enabled only as far as needed; options understood and not copy-pasted blindly (5)

### Route parameter validation (10)
- Positive integers only: `0`, negatives, decimals, non-numeric all rejected with 400 (6)
- Uses Nest's parameter-pipe mechanism, not hand-written checks in every route (4)

### Correct HTTP exceptions and status codes (15)
- 201 / 200 / 204 on success as specified (4)
- 400 for invalid input, 404 only for valid-but-missing, never 500 for client mistakes (6)
- Validation happens before lookup (invalid body + missing id ⇒ 400); no state is changed by rejected requests (3)
- Unexpected errors surface as 500 and are not swallowed or leaked (2)

### Error-response consistency (10)
- Every expected error matches the documented schema (`statusCode`, `error`, `message`, optional `errors[]`) (5)
- Field-level details for body validation errors, with unknown properties named (3)
- No stack traces or internals; no success responses with embedded errors (2)

### Architecture and separation of responsibilities (10)
- Validation lives in DTOs/pipes, not hand-written in controller methods (3)
- Service owns business rules and throws Nest exceptions; no HTTP objects in it (3)
- Error formatting is centralised once (pipe factory, filter or both), not repeated per endpoint; the decision about a custom filter is justified and not over-engineered (2)
- Create/Update rules are reused deliberately, not copy-pasted without thought (2)

### Automated tests and test quality (10)
- All provided tests pass without being weakened or deleted (5)
- You added at least a few tests of your own for decisions the provided tests do not cover (e.g. the reuse strategy, filter/pipe unit tests) that are isolated and not order-dependent (5)

### TypeScript correctness and maintainability (5)
- `pnpm build` and `pnpm lint` are clean; no stray `any`/unused code; names and comments are clear (5)

## Review questions you should be able to answer

1. Why does `@IsOptional()` not satisfy "optional but never null"?
2. What does `forbidNonWhitelisted` need in order to work, and which property counts as "known"?
3. Why is the empty-PATCH rule enforced where you put it?
4. What would break if the 404 lookup ran before body validation?
5. Did you need a custom exception filter? Why or why not?
6. What happens to a non-HTTP error in your design?
