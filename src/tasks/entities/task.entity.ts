/**
 * TODO: Turn this class into a TypeORM entity (the starter is a plain class
 *       so the project compiles; Task 1/2 used an interface).
 *
 * Required (see ASSIGNMENT.md, "Data model"):
 *   - table mapping decorator
 *   - `id`: database-generated numeric primary key
 *   - `title`: required, max 100 chars
 *   - `description`: optional (nullable), max 500 chars
 *   - `completed`: boolean, default false
 *   - `createdAt` / `updatedAt`: set by the database/ORM, never by the client
 *   - `projectId`: a REAL foreign key to Project (Many-to-One), mapped with a
 *     relationship decorator, NOT just a plain number column
 *   - choose and document the ON DELETE behaviour (deleting a project that
 *     still has tasks must be rejected; no cascade)
 */
export class Task {
  id: number;
  title: string;
  description?: string | null;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  projectId: number;
  // TODO: project relationship (Many-to-One)
}
