import {
  CanActivate,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';

/**
 * Runs the "local" strategy for POST /auth/login.
 *
 * SCAFFOLDING: denies everything until you implement it (fails closed).
 *
 * TODO: Make it a guard backed by Passport's "local" strategy so the login
 *       handler only runs with valid credentials and receives the
 *       authenticated principal on the request.
 */
@Injectable()
export class LocalAuthGuard implements CanActivate {
  canActivate(): boolean {
    throw new NotImplementedException('TODO: LocalAuthGuard');
  }
}
