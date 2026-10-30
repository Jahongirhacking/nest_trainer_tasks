# Hints – Assignment 5 (read level by level)

No level contains a finished decorator, guard or permission check.

## Level 1 – Concepts

- **Authentication vs. authorization**: 401 = "I do not know who you are"; 403 = "I know who you are, and the answer is no". Task 4 produced the first; this task produces the second. Both are *guards*, but they are different guards with different answers.
- **A decorator that "does something" often does nothing**: `@Roles()` does not check anything. It only attaches a note (metadata) to a class or a method. Another piece (the guard) reads the note later. Separating *declaring* from *enforcing* is the whole design.
- **Reflector**: Nest's tool for reading that metadata back. It can look at one place, at several places, and it has helpers for the two questions "which place wins?" and "should the places be combined?". Read its documentation: the difference between the helpers is exactly this task's *route vs controller* question.
- **ExecutionContext**: gives the guard the *handler* (the method) and the *class* (the controller) that are about to run, and the request. That is how a guard knows what metadata to read.
- **Roles vs. permissions**: a role is a label for a kind of person; a permission is one thing that may be done. Routes that list permissions survive new roles; routes that list roles are shorter to read. The matrix connects them.
- **Role-level vs. resource-level**: "managers may update tasks" is about the role. "you may change *this* task's status because it is yours" depends on the specific row, so a role alone cannot answer it.
- **Never trust the client for identity**: a token is only proof of *who*, signed long ago. What that user may do **now** is in the database.
- **Fail closed**: when in doubt (no user, unknown role, unexpected error) the answer is *no*.

## Level 2 – Structure

- **Metadata keys** are in `rbac.constants.ts` so the decorator and the guard cannot disagree on the name.
- **Decorators**: look at what Nest ships for attaching metadata, and at how a parameter decorator receives `(data, context)`. The existing Task 4 `CurrentUser` is the model for the param decorator, but this one is typed with `role`.
- **Guard order**: guards listed in `@UseGuards(A, B)` run left to right; if `A` throws or says no, `B` never runs. Put authentication first. Guards run **before** pipes, which is why a forbidden caller never reaches body validation.
- **Where to read the principal**: `request.user`, set by the Task 4 `JwtStrategy`. Check it for existence and for a *real* `Role` before using it.
- **Returning `false`** from a guard makes Nest raise 403 for you. Throwing your own exception is also possible, but then the tests that expect `false` will tell you which contract the guard has here.
- **Matrix → permissions**: the guard maps the caller's role to a list of permissions, then asks whether the required ones are all inside. Look at the array methods that answer "does every / does some".
- **Ownership**: the id of the task is in the route parameters. The guard runs before the `PositiveIntParam` pipe, so validating the raw string is *your* job. Decide how a bad id is answered.
- **Assignment rule**: it needs two roles (the caller's and the assignee's). The service already loads the assignee; the caller is passed in. Decide the status code for a violation and be able to defend it.
- **Module wiring**: guards used with `@UseGuards(SomeGuard)` are instantiated by Nest in the context of the module that owns the controller, so their dependencies (`Reflector`, `RbacTasksService`) must be resolvable there.
- **The `role` column**: add it to the `User` entity, then follow `src/migrations/README.md`. Existing rows need a default; ask yourself what role Task 4's registration should give new accounts.

## Level 3 – Debugging

| Symptom | Likely cause |
|---|---|
| Every protected test returns 403, even for ADMIN | the guard still returns `false` (starter), or the matrix is empty |
| The guard "ignores" `@Roles` | the decorator writes under a different key than the guard reads, or the decorator is still the no-op starter |
| Controller-level `@Roles` is ignored when a route also has one | you read only the handler, or you combine instead of replace |
| Controller-level `@Permissions` seems ignored | you read only the handler |
| `undefined` in `@CurrentUser()` | the authentication guard did not run first, or the factory reads the wrong request field |
| ADMIN is denied by `RolesGuard` on `/users/:id` | the route's `@Roles` does not list ADMIN; there is no automatic bypass |
| 500 on `PATCH /tasks/abc/status` | the ownership guard converts the id without validating it |
| Manager can assign a task to an admin | the assignment rule was not implemented, or it looks at an old role |
| 404 instead of 403 for a forbidden caller on a missing id | the lookup happens before the role check (guards must run first) |
| `Nest can't resolve dependencies of the TaskOwnerGuard` | `RbacTasksService` is not provided/exported where the controller lives |
| After adding the `role` column Task 4 e2e tests fail | no default for existing rows, or registration does not set a role |

Debugging tools: `pnpm test:rbac -t "roles.guard"` runs one file's tests; `console.log(Reflect.getMetadataKeys(Controller.prototype.method))` shows what a decorator wrote.

## Level 4 – Design questions to answer in your own words

1. Why do roles *replace* but permissions *merge* between handler and controller in this assignment? What bug does each choice prevent or create?
2. What is the risk of "no metadata → allowed"? When would you flip the default, and what would break?
3. Why is the role loaded from the database on every request instead of stored in the token? What does it cost?
4. Why is a missing task 404 for everyone, and would you ever answer 403 instead?
5. Guard or service policy for ownership: which did you choose, and what test would convince a reviewer?
