import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RbacTasksService } from '../tasks/rbac-tasks.service.js';

/**
 * Resource-level authorization for `PATCH /tasks/:id/status`: only the user the
 * task is ASSIGNED TO, or an ADMIN, may change the status.
 *
 * Roles and permissions say what a caller may do in general; ownership depends
 * on the specific task, so it needs the task from the database.
 *
 * SCAFFOLDING: denies everything (fails closed).
 *
 * TODO: Implement `canActivate`:
 *       - read the task id from the route (it is a path parameter; validate it
 *         yourself, pipes have not run yet),
 *       - load the task with RbacTasksService (a missing task must end as 404,
 *         for every caller, see README "Ownership rules"),
 *       - ADMIN passes; otherwise the principal's id must equal the task's
 *         `assigneeId`. A task nobody is assigned to belongs to nobody.
 * TODO (design question): is a guard the right place for this, or a policy
 *       called from the service? Decide, and be ready to defend the choice.
 */
@Injectable()
export class TaskOwnerGuard implements CanActivate {
  constructor(private readonly tasksService: RbacTasksService) {}

  canActivate(_context: ExecutionContext): boolean | Promise<boolean> {
    return false;
  }
}
