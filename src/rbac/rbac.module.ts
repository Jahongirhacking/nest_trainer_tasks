import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestProcessingModule } from '../common/request-processing.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { Task } from '../tasks/entities/task.entity.js';
import { User } from '../users/entities/user.entity.js';
import { PermissionsGuard } from './guards/permissions.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { TaskOwnerGuard } from './guards/task-owner.guard.js';
import { RbacTasksController } from './tasks/rbac-tasks.controller.js';
import { RbacTasksService } from './tasks/rbac-tasks.service.js';
import { RbacUsersController } from './users/rbac-users.controller.js';
import { RbacUsersService } from './users/rbac-users.service.js';

/**
 * Wiring of the Task 5 feature, imported by AppModule.
 *
 * The module does not import AuthModule: the "jwt" Passport strategy is
 * registered once by AuthModule (Task 4) and the guards below rely on it.
 * There is ONE `Task` entity (src/tasks). Task 3's flat task routes were
 * removed so `/tasks` is served only by RbacTasksController.
 *
 * TODO: Decide how the guards are applied - per controller with @UseGuards(),
 *       or globally with the APP_GUARD token (advanced challenge 6) - and wire
 *       them here accordingly. Order matters: authentication first.
 * TODO: Generate and REVIEW the migration for the `role` column on `users`
 *       (src/migrations/README.md). The `tasks` columns added for Task 5
 *       (status, assigneeId, createdById) have their own migration.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Task]),
    ProjectsModule,
    RequestProcessingModule,
  ],
  controllers: [RbacUsersController, RbacTasksController],
  providers: [
    RbacUsersService,
    RbacTasksService,
    RolesGuard,
    PermissionsGuard,
    TaskOwnerGuard,
  ],
})
export class RbacModule {}
