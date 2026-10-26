import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
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
@Controller('tasks')
export class TasksController {
  // TODO: Inject TasksService through the constructor.
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTaskDto): Task {
    // TODO: Implement the controller endpoint (POST /tasks).
    return this.tasksService.create(dto);
  }

  @Get()
  findAll(): Task[] {
    // TODO: Implement the controller endpoint (GET /tasks).
    return this.tasksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseIntPipe()) id: number): Task {
    // TODO: Implement the controller endpoint (GET /tasks/:id).
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() dto: UpdateTaskDto,
  ): Task {
    // TODO: Implement the controller endpoint (PATCH /tasks/:id).
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', new ParseIntPipe()) id: number): void {
    // TODO: Implement the controller endpoint (DELETE /tasks/:id).
    return this.tasksService.remove(id);
  }
}
