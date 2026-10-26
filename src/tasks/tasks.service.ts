import { Injectable } from '@nestjs/common';
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

  create(dto: CreateTaskDto): Task {
    // TODO: Implement task creation.
    void dto;
    throw new Error('Not implemented');
  }

  findAll(): Task[] {
    // TODO: Implement listing all tasks.
    throw new Error('Not implemented');
  }

  findOne(id: number): Task {
    // TODO: Implement task lookup (throw the proper Nest exception if missing).
    void id;
    throw new Error('Not implemented');
  }

  update(id: number, dto: UpdateTaskDto): Task {
    // TODO: Implement task update.
    void id;
    void dto;
    throw new Error('Not implemented');
  }

  remove(id: number): void {
    // TODO: Implement task deletion.
    void id;
    throw new Error('Not implemented');
  }
}
