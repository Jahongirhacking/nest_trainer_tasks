import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectsService } from '../projects/projects.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { Task } from './entities/task.entity.js';

/**
 * NOTE: every body below is TEMPORARY SCAFFOLDING (HTTP 501). The Task 1/2
 * in-memory implementation was removed on purpose: Task 3 replaces the array
 * with a TypeORM repository. Keep the method names and parameter order.
 *
 * TODO: Inject the Task repository with @InjectRepository(Task) (and whatever
 *       you need to verify that the parent project exists).
 * TODO: Never let the client set id, projectId, createdAt or updatedAt.
 * TODO: Translate KNOWN database errors only; let everything else surface.
 */
@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly taskRepository: Repository<Task>,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(_projectId: number, _dto: CreateTaskDto): Promise<Task> {
    // TODO: 404 if the project does not exist; completed defaults to false.
    await this.projectsService.findOne(_projectId);
    const task = this.taskRepository.create({
      ..._dto,
      projectId: _projectId,
    });
    return this.taskRepository.save(task);
  }

  findAll(): Promise<Task[]> {
    // TODO: all tasks, via a database query.
    return this.taskRepository.find();
  }

  async findAllByProject(_projectId: number): Promise<Task[]> {
    // TODO: 404 if the project does not exist; only that project's tasks.
    await this.projectsService.findOne(_projectId);
    return this.taskRepository.find({ where: { projectId: _projectId } });
  }

  async findOne(_id: number): Promise<Task> {
    // TODO: the task or NotFoundException.
    const task = await this.taskRepository.findOne({ where: { id: _id } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(_id: number, _dto: UpdateTaskDto): Promise<Task> {
    // TODO: reject an empty body (400); 404 if missing; no project reassignment.
    const { title, description, completed } = _dto;
    const changes = Object.fromEntries(
      Object.entries({ title, description, completed }).filter(
        ([, value]) => value !== undefined,
      ),
    );
    if (!Object.keys(changes).length)
      throw new BadRequestException('Empty body');
    const task = await this.findOne(_id);
    Object.assign(task, changes);
    return this.taskRepository.save(task);
  }

  async remove(_id: number): Promise<void> {
    // TODO: 404 if missing; must not touch the parent project.
    const task = await this.findOne(_id);
    await this.taskRepository.remove(task);
  }
}
