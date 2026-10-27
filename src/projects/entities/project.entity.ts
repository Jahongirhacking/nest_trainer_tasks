/**
 * TODO: Turn this class into a TypeORM entity (the starter is a plain class
 *       so the project compiles).
 *
 * Required (see ASSIGNMENT.md, "Data model"):
 *   - table mapping decorator
 *   - `id`: database-generated numeric primary key
 *   - `name`: required, max 100 chars, UNIQUE at the database level
 *   - `description`: optional (nullable), max 500 chars
 *   - `createdAt` / `updatedAt`: set by the database/ORM, never by the client
 *   - the "one project has many tasks" side of the relationship
 *
 * Careful with the circular import between Project and Task
 * (see HINTS.md, Level 3: "Entity metadata errors").
 */
export class Project {
  id: number;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // TODO: tasks relationship
}
