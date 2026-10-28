import {
  Body,
  Controller,
  Get,
  NotImplementedException,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { SafeUser } from './auth.constants.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

/**
 * NOTE: scaffolding. Every handler answers HTTP 501 until you implement it.
 * Keep the routes and method names.
 *
 *   POST /auth/register   -> 201 safe user
 *   POST /auth/login      -> 200 { accessToken }       (LocalAuthGuard)
 *   GET  /auth/me         -> 200 safe user             (JwtAuthGuard)
 *   GET  /auth/protected  -> 200 minimal body          (JwtAuthGuard)
 *
 * TODO: add the guards, the status codes, the validated @Body() / @Req()
 *       parameters and the @CurrentUser() decorator. There is deliberately NO
 *       logout route: see ASSIGNMENT.md, "Logout".
 * TODO: Controllers never touch a repository.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() _dto: RegisterDto): Promise<SafeUser> {
    throw new NotImplementedException('TODO: POST /auth/register');
  }

  @Post('login')
  login(@Body() _dto: LoginDto): Promise<{ accessToken: string }> {
    throw new NotImplementedException('TODO: POST /auth/login');
  }

  @Get('me')
  me(): SafeUser {
    throw new NotImplementedException('TODO: GET /auth/me');
  }

  @Get('protected')
  protected(): { message: string } {
    throw new NotImplementedException('TODO: GET /auth/protected');
  }
}
