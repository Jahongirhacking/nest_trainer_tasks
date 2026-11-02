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
import type { Task } from '../../tasks/entities/task.entity.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import { Permissions } from '../decorators/permissions.decorator.js';
import { Roles } from '../decorators/roles.decorator.js';
import { Permission } from '../enums/permission.enum.js';
import { Role } from '../enums/role.enum.js';
import { PermissionsGuard } from '../guards/permissions.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { TaskOwnerGuard } from '../guards/task-owner.guard.js';
import type { AuthenticatedUser } from '../rbac.types.js';
import { AssignTaskDto } from './dto/assign-task.dto.js';
import { CreateRbacTaskDto } from './dto/create-rbac-task.dto.js';
import { UpdateRbacTaskDto } from './dto/update-rbac-task.dto.js';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto.js';
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
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('tasks')
export class RbacTasksController {
  constructor(private readonly tasksService: RbacTasksService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Permissions(Permission.TASKS_READ)
  @Get()
  findAll(): Promise<Task[]> {
    return this.tasksService.findAll();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Permissions(Permission.TASKS_CREATE)
  @Post()
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateRbacTaskDto,
  ): Promise<Task> {
    return this.tasksService.create(actor, dto);
  }

  @Get('my')
  findMine(@CurrentUser() actor: AuthenticatedUser): Promise<Task[]> {
    return this.tasksService.findAssignedTo(actor.id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Permissions(Permission.TASKS_UPDATE)
  @Patch(':id')
  update(
    @PositiveIntParam('id') id: number,
    @Body() dto: UpdateRbacTaskDto,
  ): Promise<Task> {
    return this.tasksService.update(Number(id), dto);
  }

  @UseGuards(TaskOwnerGuard)
  @Patch(':id/status')
  @HttpCode(200)
  updateStatus(
    @PositiveIntParam('id') id: number,
    @Body() dto: UpdateTaskStatusDto,
  ): Promise<Task> {
    return this.tasksService.updateStatus(Number(id), dto.status);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Permissions(Permission.TASKS_ASSIGN)
  @Patch(':id/assign')
  assign(
    @CurrentUser() actor: AuthenticatedUser,
    @PositiveIntParam('id') id: number,
    @Body() dto: AssignTaskDto,
  ): Promise<Task> {
    return this.tasksService.assign(actor, Number(id), dto);
  }

  @Roles(Role.ADMIN)
  @Permissions(Permission.TASKS_DELETE)
  @Delete(':id')
  @HttpCode(204)
  async remove(@PositiveIntParam('id') id: number): Promise<void> {
    await this.tasksService.remove(Number(id));
  }
}
