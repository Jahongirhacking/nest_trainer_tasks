import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';

/**
 * TODO: Import `TypeOrmModule.forFeature([User])` so UsersService can inject
 *       the repository, and keep exporting UsersService for AuthModule.
 *       Nothing else should reach the User repository directly.
 */
@Module({
  providers: [UsersService],
  exports: [UsersService],
  imports: [TypeOrmModule.forFeature([User])],
})
export class UsersModule {}
