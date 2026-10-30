import type { SafeUser } from '../auth/auth.constants.js';
import type { User } from '../users/entities/user.entity.js';
import type { Role } from './enums/role.enum.js';

/**
 * The principal the guards work with: what `request.user` holds after the
 * "jwt" strategy ran. It comes from the DATABASE, never from token claims.
 */
export interface AuthenticatedUser {
  id: number;
  email: string;
  role: Role;
}

/**
 * TODO: The Task 4 `User` entity has no `role` column yet (adding it, plus a
 *       migration, is implementation step 1 in the README). This alias lets the
 *       scaffold compile until then. Once the column exists, delete this alias
 *       and use `User` / `SafeUser` directly.
 */
export type UserWithRole = User & { role: Role };

/** A user as returned by the API: never any credential material. */
export type ManagedUser = Omit<UserWithRole, 'passwordHash'>;

export type { SafeUser };
