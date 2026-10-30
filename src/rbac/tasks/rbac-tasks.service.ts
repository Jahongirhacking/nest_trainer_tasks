import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { TaskStatus } from '../enums/task-status.enum.js';
import type { AuthenticatedUser } from '../rbac.types.js';
import type { AssignTaskDto } from './dto/assign-task.dto.js';
import type { CreateRbacTaskDto } from './dto/create-rbac-task.dto.js';
import type { UpdateRbacTaskDto } from './dto/update-rbac-task.dto.js';
import { RbacTask } from './entities/rbac-task.entity.js';

/**
 * Task persistence and plain business rules. Providing this class is NOT part
 * of the assignment, and neither is the CRUD in it: the assignment is WHO may
 * call these methods (guards), not how they store things.
 *
 * Only one rule here is yours, see the TODO in `assign`.
 */
@Injectable()
export class RbacTasksService {
  constructor(
    @InjectRepository(RbacTask) private readonly tasks: Repository<RbacTask>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findAll(): Promise<RbacTask[]> {
    return this.tasks.find();
  }

  findAssignedTo(userId: number): Promise<RbacTask[]> {
    return this.tasks.find({ where: { assigneeId: userId } });
  }

  async findOne(id: number): Promise<RbacTask> {
    const task = await this.tasks.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  create(actor: AuthenticatedUser, dto: CreateRbacTaskDto): Promise<RbacTask> {
    const task = this.tasks.create({
      title: dto.title,
      description: dto.description ?? null,
      status: TaskStatus.TODO,
      assigneeId: null,
      createdById: actor.id,
    });
    return this.tasks.save(task);
  }

  async update(id: number, dto: UpdateRbacTaskDto): Promise<RbacTask> {
    const task = await this.findOne(id);
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    return this.tasks.save(task);
  }

  async updateStatus(id: number, status: TaskStatus): Promise<RbacTask> {
    const task = await this.findOne(id);
    task.status = status;
    return this.tasks.save(task);
  }

  /**
   * TODO: A MANAGER may only assign tasks to accounts whose role is USER;
   *       only an ADMIN may assign to anybody. The rule needs the actor's role
   *       and the assignee's role (README, "Assignment rules"). Decide where
   *       this check belongs, and which HTTP status a violation produces.
   */
  async assign(
    _actor: AuthenticatedUser,
    id: number,
    dto: AssignTaskDto,
  ): Promise<RbacTask> {
    const task = await this.findOne(id);
    const assignee = await this.users.findOne({ where: { id: dto.assigneeId } });
    if (!assignee)
      throw new NotFoundException(`User ${dto.assigneeId} not found`);
    task.assigneeId = assignee.id;
    return this.tasks.save(task);
  }

  async remove(id: number): Promise<void> {
    const task = await this.findOne(id);
    await this.tasks.remove(task);
  }
}
