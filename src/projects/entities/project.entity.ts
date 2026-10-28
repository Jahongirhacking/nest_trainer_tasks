import type { Relation } from 'typeorm';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Task } from '../../tasks/entities/task.entity.js';

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
@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ unique: true, type: 'varchar', length: 100 })
  name: string;
  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string | null;
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
  // TODO: tasks relationship
  @OneToMany(() => Task, (task) => task.project)
  tasks: Relation<Task[]>;
}
