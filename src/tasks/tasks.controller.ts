import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import type { Task } from './entities/task.entity.js';
import { TasksService } from './tasks.service.js';

/**
 * NOTE: scaffolding. Keep the method names and parameter order: the
 * controller unit tests call them directly.
 *
 * Routes (ASSIGNMENT.md, "API"):
 *   POST   /projects/:projectId/tasks   -> create
 *   GET    /projects/:projectId/tasks   -> findAllByProject
 *   GET    /tasks                       -> findAll
 *   GET    /tasks/:id                   -> findOne
 *   PATCH  /tasks/:id                   -> update
 *   DELETE /tasks/:id                   -> remove
 *
 * TODO: Replace @Injectable() with @Controller(...) (the two route prefixes
 *       differ: choose how to express that, e.g. an empty prefix with full
 *       paths on each method, or a second controller), inject TasksService
 *       and add every decorator/pipe/status code.
 */
@Injectable()
export class TasksController {
  // TODO: inject TasksService through the constructor.
  constructor(private readonly tasksService: TasksService) {}

  create(_projectId: number, _dto: CreateTaskDto): Promise<Task> {
    throw new NotImplementedException('TasksController.create');
  }

  findAllByProject(_projectId: number): Promise<Task[]> {
    throw new NotImplementedException('TasksController.findAllByProject');
  }

  findAll(): Promise<Task[]> {
    throw new NotImplementedException('TasksController.findAll');
  }

  findOne(_id: number): Promise<Task> {
    throw new NotImplementedException('TasksController.findOne');
  }

  update(_id: number, _dto: UpdateTaskDto): Promise<Task> {
    throw new NotImplementedException('TasksController.update');
  }

  remove(_id: number): Promise<void> {
    throw new NotImplementedException('TasksController.remove');
  }
}
