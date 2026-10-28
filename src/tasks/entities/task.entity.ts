import type { Relation } from 'typeorm';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity.js';

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
@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ type: 'varchar', length: 100 })
  title: string;
  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string | null;
  @Column({ type: 'boolean', default: false })
  completed: boolean;
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
  @Column({ type: 'integer' })
  projectId: number;
  // TODO: project relationship (Many-to-One)
  @ManyToOne(() => Project, (project) => project.tasks, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'projectId' })
  project: Relation<Project>;
}
