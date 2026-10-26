import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import type { Task } from './entities/task.entity.js';

/**
 * NOTE: every method body below is TEMPORARY SCAFFOLDING so the project
 * compiles. Each `throw` must be replaced by your real implementation.
 * Keep the method names and signatures: the tests depend on them.
 */
@Injectable()
export class TasksService {
  // TODO: Add the in-memory storage (and whatever you need for ID generation).
  private readonly tasks: Task[] = [];

  generateId() {
    return Math.ceil(1_000_000 * Math.random());
  }

  create(dto: CreateTaskDto): Task {
    // TODO: Implement task creation.
    const newTask = {
      description: '',
      id: this.generateId(),
      createdAt: new Date(),
      completed: false,
      ...dto,
    };
    this.tasks.push(newTask);
    return newTask;
  }

  findAll(): Task[] {
    // TODO: Implement listing all tasks.
    return this.tasks;
  }

  findOne(id: number): Task {
    // TODO: Implement task lookup (throw the proper Nest exception if missing).
    const task = this.tasks.find((t) => t?.id === id);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  update(id: number, dto: UpdateTaskDto): Task {
    // TODO: Implement task update.
    if (
      typeof dto !== 'object' ||
      dto === null ||
      !Object.values(dto).some((value) => value !== undefined)
    )
      throw new BadRequestException('Validation Error');
    const task = this.findOne(id);
    Object.entries(dto).forEach(([key, value]) => {
      if (value !== undefined) {
        Object.assign(task, { [key]: value });
      }
    });
    return task;
  }

  remove(id: number): void {
    // TODO: Implement task deletion.
    const taskIndex = this.tasks.findIndex((t) => t?.id === id);
    if (taskIndex === -1) throw new NotFoundException('Task not found');
    this.tasks.splice(taskIndex, 1);
  }
}
