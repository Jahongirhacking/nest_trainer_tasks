import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';

/**
 * TODO: Import `TypeOrmModule.forFeature([User])` so UsersService can inject
 *       the repository, and keep exporting UsersService for AuthModule.
 *       Nothing else should reach the User repository directly.
 */
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
