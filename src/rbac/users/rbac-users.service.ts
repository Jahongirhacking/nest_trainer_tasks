import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { DeepPartial, Repository } from 'typeorm';
import { isUniqueViolation } from '../../common/database/postgres-errors.js';
import { User } from '../../users/entities/user.entity.js';
import type { ManagedUser, UserWithRole } from '../rbac.types.js';
import type { CreateManagedUserDto } from './dto/create-managed-user.dto.js';
import type { UpdateManagedUserDto } from './dto/update-managed-user.dto.js';

const toManagedUser = (user: UserWithRole): ManagedUser => {
  const { passwordHash: _passwordHash, ...managed } = user;
  return managed;
};

/**
 * User administration for the RBAC module (list / create / update / delete).
 * Persistence only: who may call it is decided by guards, not here.
 */
@Injectable()
export class RbacUsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async findAll(): Promise<ManagedUser[]> {
    const users = (await this.users.find()) as UserWithRole[];
    return users.map(toManagedUser);
  }

  async create(dto: CreateManagedUserDto): Promise<ManagedUser> {
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });
    // `role` is not a column of the Task 4 entity yet: see rbac.types.ts.
    const user = this.users.create({
      email: dto.email,
      passwordHash,
      role: dto.role,
    } as DeepPartial<User>);
    try {
      return toManagedUser((await this.users.save(user)) as UserWithRole);
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException('Email is already registered');
      throw error;
    }
  }

  async update(id: number, dto: UpdateManagedUserDto): Promise<ManagedUser> {
    const user = (await this.users.findOne({ where: { id } })) as
      | UserWithRole
      | null;
    if (!user) throw new NotFoundException(`User ${id} not found`);
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.role !== undefined) user.role = dto.role;
    try {
      return toManagedUser((await this.users.save(user)) as UserWithRole);
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException('Email is already registered');
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    await this.users.remove(user);
  }
}
