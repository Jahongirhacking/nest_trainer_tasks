/** Fine-grained capabilities. Roles are mapped to them in role-permissions.ts. */
export enum Permission {
  USERS_READ = 'users.read',
  USERS_CREATE = 'users.create',
  USERS_UPDATE = 'users.update',
  USERS_DELETE = 'users.delete',
  TASKS_READ = 'tasks.read',
  TASKS_CREATE = 'tasks.create',
  TASKS_UPDATE = 'tasks.update',
  TASKS_DELETE = 'tasks.delete',
  TASKS_ASSIGN = 'tasks.assign',
  ROLES_MANAGE = 'roles.manage',
}
