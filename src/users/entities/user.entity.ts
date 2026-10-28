/**
 * Table `users` (see ASSIGNMENT.md, "User data model").
 *
 * SCAFFOLDING: this class is intentionally NOT an entity yet. Until it is
 * decorated, TypeORM ignores it and the Task 1-3 endpoints keep working.
 *
 * TODO: Turn it into an entity mapped to the table "users":
 *       - `id`: generated primary key.
 *       - `email`: required, UNIQUE in the database, stored normalized.
 *       - `passwordHash`: required. Never a plaintext password.
 *       - `createdAt` / `updatedAt`: database generated. Remember the Task 3
 *         lesson about time zones (`timestamptz`).
 * TODO: Decide how `passwordHash` is kept out of queries and responses by
 *       default (for example `select: false`) and what that means for the
 *       lookup used by login.
 * TODO: Register the entity in UsersModule (`TypeOrmModule.forFeature`), then
 *       generate and REVIEW a migration (see src/migrations/README.md).
 */
export class User {
  id: number;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}
