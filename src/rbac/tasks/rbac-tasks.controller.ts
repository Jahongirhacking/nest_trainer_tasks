import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { PositiveIntParam } from '../../common/decorators/positive-int-param.decorator.js';
import { RequestMetadata } from '../../common/decorators/request-metadata.decorator.js';
import { SkipRequestTiming } from '../../common/decorators/skip-request-timing.decorator.js';
import type { RequestMetadataInfo } from '../../common/interfaces/request-metadata.interface.js';
import { ParseResourceIdPipe } from '../../common/pipes/parse-resource-id.pipe.js';
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

  // TASK 6 TODO: paginate with `@Query(PaginationPipe)` (?page=2&limit=10).
  //   `tasksService.findAll()` already accepts a `Pagination`. The body stays a
  //   plain array. Import RequestProcessingModule where the pipe's config
  //   dependency can be resolved (see request-processing.module.ts).
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

  // TASK 6 - request processing demo routes. Any authenticated user may call
  // them. They are declared BEFORE `:id` routes so `:id` never captures them.

  /** Echoes the request metadata the middleware recorded. */
  @Get('request-info')
  requestInfo(
    @RequestMetadata() metadata: RequestMetadataInfo | undefined,
  ): RequestMetadataInfo | null {
    return metadata ?? null;
  }

  /** A slow-ish async handler: lets the timing interceptor measure something. */
  @Get('processing-info')
  async processingInfo(
    @RequestMetadata() metadata: RequestMetadataInfo | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ requestId: string | null; userId: number }> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { requestId: metadata?.requestId ?? null, userId: actor.id };
  }

  /** Never timed. */
  @SkipRequestTiming()
  @Get('skip-timing')
  skipTiming(): { timed: false } {
    return { timed: false };
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Permissions(Permission.TASKS_READ)
  @Get(':id')
  findOne(@Param('id', ParseResourceIdPipe) id: string): Promise<Task> {
    // `id` is typed `string` on purpose: see HINTS.md ("Pipes and the global
    // ValidationPipe"). The pipe returns a number at runtime.
    return this.tasksService.findOne(Number(id));
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
