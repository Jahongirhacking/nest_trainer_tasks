import { Body, Controller, Get, Post } from '@nestjs/common';
import { PositiveIntParam } from '../common/decorators/positive-int-param.decorator.js';
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
 *
 * The flat routes (GET /tasks, GET|PATCH|DELETE /tasks/:id) were removed in
 * Assignment 5: /tasks is now the RBAC-protected API in src/rbac.
 *
 * TODO: Replace @Injectable() with @Controller(...) (the two route prefixes
 *       differ: choose how to express that, e.g. an empty prefix with full
 *       paths on each method, or a second controller), inject TasksService
 *       and add every decorator/pipe/status code.
 */
@Controller()
export class TasksController {
  // TODO: inject TasksService through the constructor.
  constructor(private readonly tasksService: TasksService) {}

  @Post('/projects/:projectId/tasks')
  create(
    @PositiveIntParam('projectId') _projectId: number,
    @Body() _dto: CreateTaskDto,
  ): Promise<Task> {
    return this.tasksService.create(_projectId, _dto);
  }

  @Get('/projects/:projectId/tasks')
  findAllByProject(
    @PositiveIntParam('projectId') _projectId: number,
  ): Promise<Task[]> {
    return this.tasksService.findAllByProject(_projectId);
  }

  // Not routed: the flat task routes were replaced by the RBAC-protected
  // `/tasks` routes (src/rbac). Kept for the unit tests and internal use.
  findAll(): Promise<Task[]> {
    return this.tasksService.findAll();
  }

  findOne(@PositiveIntParam('id') _id: number): Promise<Task> {
    return this.tasksService.findOne(_id);
  }

  update(
    @PositiveIntParam('id') _id: number,
    @Body() _dto: UpdateTaskDto,
  ): Promise<Task> {
    return this.tasksService.update(_id, _dto);
  }

  remove(@PositiveIntParam('id') _id: number): Promise<void> {
    return this.tasksService.remove(_id);
  }
}
