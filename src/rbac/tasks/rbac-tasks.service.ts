import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Pagination } from '../../common/pipes/pagination.pipe.js';
import { ProjectsService } from '../../projects/projects.service.js';
import { Task } from '../../tasks/entities/task.entity.js';
import { TaskStatus } from '../../tasks/enums/task-status.enum.js';
import { User } from '../../users/entities/user.entity.js';
import { Role } from '../enums/role.enum.js';
import type { AuthenticatedUser } from '../rbac.types.js';
import type { AssignTaskDto } from './dto/assign-task.dto.js';
import type { CreateRbacTaskDto } from './dto/create-rbac-task.dto.js';
import type { UpdateRbacTaskDto } from './dto/update-rbac-task.dto.js';

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
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly projectsService: ProjectsService,
  ) {}

  /** All tasks, or one page of them when `pagination` is given. */
  findAll(pagination?: Pagination): Promise<Task[]> {
    if (!pagination) return this.tasks.find();
    return this.tasks.find({
      order: { id: 'ASC' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    });
  }

  findAssignedTo(userId: number): Promise<Task[]> {
    return this.tasks.find({ where: { assigneeId: userId } });
  }

  async findOne(id: number): Promise<Task> {
    const task = await this.tasks.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateRbacTaskDto,
  ): Promise<Task> {
    await this.projectsService.findOne(dto.projectId);
    const task = this.tasks.create({
      title: dto.title,
      description: dto.description ?? null,
      projectId: dto.projectId,
      status: TaskStatus.TODO,
      completed: false,
      assigneeId: null,
      createdById: actor.id,
    });
    return this.tasks.save(task);
  }

  async update(id: number, dto: UpdateRbacTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    return this.tasks.save(task);
  }

  async updateStatus(id: number, status: TaskStatus): Promise<Task> {
    const task = await this.findOne(id);
    task.status = status;
    task.completed = status === TaskStatus.DONE;
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
  ): Promise<Task> {
    const task = await this.findOne(id);
    const assignee = await this.users.findOne({
      where: { id: dto.assigneeId },
    });
    if (!assignee)
      throw new NotFoundException(`User ${dto.assigneeId} not found`);
    if (
      (_actor.role === Role.MANAGER && assignee.role !== Role.USER) ||
      _actor.role === Role.USER
    )
      throw new ForbiddenException();
    task.assigneeId = assignee.id;
    return this.tasks.save(task);
  }

  async remove(id: number): Promise<void> {
    const task = await this.findOne(id);
    await this.tasks.remove(task);
  }
}
