import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { loadEnvFile } from 'process';
import { UsersModule } from '../users/users.module.js';
import { buildJwtConfig } from './auth.config.js';
import { JWT_CONFIG } from './auth.constants.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { LocalStrategy } from './strategies/local.strategy.js';

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
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => {
        loadEnvFile();
        return buildJwtConfig();
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    {
      provide: JWT_CONFIG,
      useFactory: () => {
        loadEnvFile();
        return buildJwtConfig();
      },
    },
  ],
})
export class AuthModule {}
