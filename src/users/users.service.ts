import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';

/**
 * User persistence ONLY. Hashing, token issuance and credential checks belong
 * to the auth module, never here.
 *
 * NOTE: every body below is TEMPORARY SCAFFOLDING (HTTP 501). Keep the method
 * names and parameter order: the tests depend on them.
 *
 * TODO: Inject the User repository with @InjectRepository(User) and implement
 *       every method on top of it. The unit tests build the service with
 *       `getRepositoryToken(User)` as the ONLY dependency.
 * TODO: `create` receives an ALREADY hashed password. A duplicate email
 *       (PostgreSQL unique violation, see src/common/database/postgres-errors.ts)
 *       becomes a ConflictException; every other database error must surface
 *       unchanged. Do not "check first, then insert": two requests can race.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  async create(_data: { email: string; passwordHash: string }): Promise<User> {
    const user = this.usersRepository.create({
      email: _data.email,
      passwordHash: _data.passwordHash,
    });
    return this.usersRepository.save(user);
  }

  /** Exact match on the stored (already normalized) email, or null. */
  findByEmail(_email: string): Promise<User | null> {
    const user = this.usersRepository.findOne({ where: { email: _email } });
    if (!user) null;
    return user;
  }

  findById(_id: number): Promise<User | null> {
    const user = this.usersRepository.findOne({ where: { id: _id } });
    if (!user) null;
    return user;
  }
}
