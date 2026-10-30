import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { PositiveIntParam } from '../../common/decorators/positive-int-param.decorator.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../rbac.types.js';
import { AssignTaskDto } from './dto/assign-task.dto.js';
import { CreateRbacTaskDto } from './dto/create-rbac-task.dto.js';
import { UpdateRbacTaskDto } from './dto/update-rbac-task.dto.js';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto.js';
import type { RbacTask } from './entities/rbac-task.entity.js';
import { RbacTasksService } from './rbac-tasks.service.js';

/**
 * Required access (README "API endpoints"):
 *
 *   GET    /tasks             ADMIN, MANAGER
 *   POST   /tasks             ADMIN, MANAGER
 *   GET    /tasks/my          any authenticated user
 *   PATCH  /tasks/:id         ADMIN, MANAGER
 *   PATCH  /tasks/:id/status  the task's owner (assignee) or ADMIN
 *   DELETE /tasks/:id         ADMIN
 *   PATCH  /tasks/:id/assign  ADMIN, MANAGER
 *
 * The handlers below contain NO authorization on purpose. Authentication
 * (JwtAuthGuard, from Task 4) is already applied to the whole controller.
 *
 * TODO: Add the authorization metadata and guards so every row above holds.
 *       Controllers must not contain `if (user.role === ...)` checks.
 * TODO: The order of the routes matters: `GET /tasks/my` must never be
 *       captured by a `:id` route.
 */
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class RbacTasksController {
  constructor(private readonly tasksService: RbacTasksService) {}

  @Get()
  findAll(): Promise<RbacTask[]> {
    return this.tasksService.findAll();
  }

  @Post()
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateRbacTaskDto,
  ): Promise<RbacTask> {
    return this.tasksService.create(actor, dto);
  }

  @Get('my')
  findMine(@CurrentUser() actor: AuthenticatedUser): Promise<RbacTask[]> {
    return this.tasksService.findAssignedTo(actor.id);
  }

  @Patch(':id')
  update(
    @PositiveIntParam('id') id: number,
    @Body() dto: UpdateRbacTaskDto,
  ): Promise<RbacTask> {
    return this.tasksService.update(Number(id), dto);
  }

  @Patch(':id/status')
  updateStatus(
    @PositiveIntParam('id') id: number,
    @Body() dto: UpdateTaskStatusDto,
  ): Promise<RbacTask> {
    return this.tasksService.updateStatus(Number(id), dto.status);
  }

  @Patch(':id/assign')
  assign(
    @CurrentUser() actor: AuthenticatedUser,
    @PositiveIntParam('id') id: number,
    @Body() dto: AssignTaskDto,
  ): Promise<RbacTask> {
    return this.tasksService.assign(actor, Number(id), dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@PositiveIntParam('id') id: number): Promise<void> {
    await this.tasksService.remove(Number(id));
  }
}
