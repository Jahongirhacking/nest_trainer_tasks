import { Controller } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import type { Task } from './entities/task.entity.js';
import { TasksService } from './tasks.service.js';

/**
 * NOTE: method bodies are TEMPORARY SCAFFOLDING. Keep the method names and
 * parameter order: the controller unit tests call them directly.
 *
 * TODO: Add the route prefix to @Controller(), the HTTP method/route
 *       decorators, parameter decorators (@Param, @Body, pipes) and the
 *       status-code decorators to every method.
 */
@Controller()
export class TasksController {
  // TODO: Inject TasksService through the constructor.

  create(dto: CreateTaskDto): Task {
    // TODO: Implement the controller endpoint (POST /tasks).
    void dto;
    throw new Error('Not implemented');
  }

  findAll(): Task[] {
    // TODO: Implement the controller endpoint (GET /tasks).
    throw new Error('Not implemented');
  }

  findOne(id: number): Task {
    // TODO: Implement the controller endpoint (GET /tasks/:id).
    void id;
    throw new Error('Not implemented');
  }

  update(id: number, dto: UpdateTaskDto): Task {
    // TODO: Implement the controller endpoint (PATCH /tasks/:id).
    void id;
    void dto;
    throw new Error('Not implemented');
  }

  remove(id: number): void {
    // TODO: Implement the controller endpoint (DELETE /tasks/:id).
    void id;
    throw new Error('Not implemented');
  }
}
