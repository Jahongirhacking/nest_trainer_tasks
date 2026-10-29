import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  JWT_STRATEGY,
  LOCAL_STRATEGY,
  type SafeUser,
} from './auth.constants.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
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
    return this.authService.register(_dto);
  }

  @UseGuards(AuthGuard(LOCAL_STRATEGY))
  @Post('login')
  login(
    @Body() _dto: LoginDto,
    @CurrentUser() user: SafeUser,
  ): Promise<{ accessToken: string }> {
    return this.authService.login(user);
  }

  @UseGuards(AuthGuard(JWT_STRATEGY))
  @Get('me')
  me(@CurrentUser() user: SafeUser): SafeUser {
    return user;
  }

  @UseGuards(AuthGuard(JWT_STRATEGY))
  @Get('protected')
  protected(): { message: string } {
    return { message: 'This is a secret!!!' };
  }
}
