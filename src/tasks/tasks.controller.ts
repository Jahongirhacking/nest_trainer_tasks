import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
} from '@nestjs/common';
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
 *   GET    /project-tasks               -> findAll
 *   GET    /project-tasks/:id           -> findOne
 *   PATCH  /project-tasks/:id           -> update
 *   DELETE /project-tasks/:id           -> remove
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

  @Get('project-tasks')
  findAll(): Promise<Task[]> {
    return this.tasksService.findAll();
  }

  @Get('project-tasks/:id')
  findOne(@PositiveIntParam('id') _id: number): Promise<Task> {
    return this.tasksService.findOne(_id);
  }

  @Patch('project-tasks/:id')
  update(
    @PositiveIntParam('id') _id: number,
    @Body() _dto: UpdateTaskDto,
  ): Promise<Task> {
    return this.tasksService.update(_id, _dto);
  }

  @Delete('project-tasks/:id')
  @HttpCode(204)
  remove(@PositiveIntParam('id') _id: number): Promise<void> {
    return this.tasksService.remove(_id);
  }
}
