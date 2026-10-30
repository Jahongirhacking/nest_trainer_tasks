import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity.js';
import { PermissionsGuard } from './guards/permissions.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { TaskOwnerGuard } from './guards/task-owner.guard.js';
import { RbacTask } from './tasks/entities/rbac-task.entity.js';
import { RbacTasksController } from './tasks/rbac-tasks.controller.js';
import { RbacTasksService } from './tasks/rbac-tasks.service.js';
import { RbacUsersController } from './users/rbac-users.controller.js';
import { RbacUsersService } from './users/rbac-users.service.js';

/**
 * Wiring of the Task 5 feature, imported by AppModule.
 *
 * The module does not import AuthModule: the "jwt" Passport strategy is
 * registered once by AuthModule (Task 4) and the guards below rely on it.
 * Task 3's flat task routes were renamed to `/project-tasks` so `/tasks` is
 * served only by RbacTasksController.
 *
 * TODO: Decide how the guards are applied - per controller with @UseGuards(),
 *       or globally with the APP_GUARD token (advanced challenge 6) - and wire
 *       them here accordingly. Order matters: authentication first.
 * TODO: Generate and REVIEW the migrations for the `role` column and for
 *       `rbac_tasks` (src/migrations/README.md). Until they run, the new
 *       endpoints cannot work against a real database.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, RbacTask])],
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
