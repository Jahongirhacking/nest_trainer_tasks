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
import { User } from '../../../../src/users/entities/user.entity.js';
import { TaskStatus } from '../../enums/task-status.enum.js';

/**
 * Table `rbac_tasks`. It is separate from the Task 3 `tasks` table (which
 * belongs to a project) so the two assignments never interfere.
 *
 * TODO: generate and REVIEW a migration for this table (src/migrations/README.md).
 */
@Entity('rbac_tasks')
export class RbacTask {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ type: 'varchar', length: 100 })
  title: string;
  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;
  @Column({ type: 'varchar', length: 20, default: TaskStatus.TODO })
  status: TaskStatus;
  /** The user the task is assigned to (its "owner"), or null. */
  @Column({ type: 'integer', nullable: true })
  assigneeId: number | null;
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigneeId' })
  assignee?: Relation<User> | null;
  @Column({ type: 'integer' })
  createdById: number;
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
