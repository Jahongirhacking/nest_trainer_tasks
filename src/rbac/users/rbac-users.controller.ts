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
import type { ManagedUser } from '../rbac.types.js';
import { CreateManagedUserDto } from './dto/create-managed-user.dto.js';
import { UpdateManagedUserDto } from './dto/update-managed-user.dto.js';
import { RbacUsersService } from './rbac-users.service.js';

/**
 * Required access (README "API endpoints"):
 *
 *   GET    /users       ADMIN, MANAGER
 *   POST   /users       ADMIN
 *   PATCH  /users/:id   ADMIN
 *   DELETE /users/:id   ADMIN
 *
 * A user reads their OWN profile through `GET /auth/me` (Task 4), so there is
 * deliberately no `GET /users/:id` here.
 *
 * The handlers contain NO authorization on purpose; JwtAuthGuard (Task 4) is
 * applied to the whole controller.
 *
 * TODO: Add the authorization metadata and guards so every row above holds.
 *       Creating a user with `role`, or changing someone's `role`, is a
 *       role-management operation: think about what that means for the access
 *       rules and the matrix (README "Role and permission matrix").
 */
@UseGuards(JwtAuthGuard)
@Controller('users')
export class RbacUsersController {
  constructor(private readonly usersService: RbacUsersService) {}

  @Get()
  findAll(): Promise<ManagedUser[]> {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() dto: CreateManagedUserDto): Promise<ManagedUser> {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(
    @PositiveIntParam('id') id: number,
    @Body() dto: UpdateManagedUserDto,
  ): Promise<ManagedUser> {
    return this.usersService.update(Number(id), dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@PositiveIntParam('id') id: number): Promise<void> {
    await this.usersService.remove(Number(id));
  }
}
