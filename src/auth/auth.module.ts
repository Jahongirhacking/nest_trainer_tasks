import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

/**
 * TODO: Finish the wiring (nothing below is a hint about HOW, only WHAT):
 *       - PassportModule and JwtModule (configured from validated settings,
 *         not from a hard-coded value),
 *       - a provider for the JWT_CONFIG token built with buildJwtConfig(),
 *       - LocalStrategy, JwtStrategy and the two guards as providers,
 *       - Nothing exported that other modules do not need.
 *       Load `.env` the same way AppModule does for the database
 *       (`loadEnvFile()` in src/database/database.config.ts).
 */
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
